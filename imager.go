package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path"
	"time"

	"github.com/pkg/errors"
)

func startImager(device, outPath string, totalSize int64, resuming bool) (progress chan string, chanErr chan error, err error) {
	if device == "" {
		return nil, nil, fmt.Errorf("error: device == ''")
	}
	if outPath == "" {
		return nil, nil, fmt.Errorf("error: path == ''")
	}
	err = prepareDir(outPath)
	if err != nil {
		return nil, nil, err
	}
	lockPath := outPath + ".lock"
	lock, err := GetLock(lockPath)
	if err != nil {
		return nil, nil, err
	}
	defer lock.Close()
	if !resuming {
		err = checkDuplicateImaging(device, outPath)
		if err != nil {
			return nil, nil, err
		}
	}
	err = saveSmartctl(device, outPath)
	if err != nil {
		return nil, nil, err
	}
	err = saveUdevinfo(device, outPath)
	if err != nil {
		return nil, nil, err
	}
	if err != nil {
		return nil, nil, err
	}
	p, err := ddrescue(device, outPath, totalSize)
	if err != nil {
		return nil, nil, err
	}
	progress = make(chan string)
	chanErr = make(chan error)
	go func(p <-chan string, progress chan string, chanErr chan error) {
		defer close(chanErr)
		for s := range p {
			progress <- s
		}
		close(progress)
		err := saveLogs(outPath)
		if err != nil {
			chanErr <- err
			return
		}
		err = setPermissions(outPath)
		if err != nil {
			chanErr <- err
			return
		}
	}(p, progress, chanErr)
	return progress, chanErr, nil
}
func prepareDir(outPath string) error {
	outdir := path.Dir(outPath)
	err := os.MkdirAll(outdir, 0755)
	return err
}

func checkDuplicateImaging(device, outPath string) error {
	outdir := path.Dir(outPath)
	files := []string{
		outPath,
		path.Join(outdir, "smartctl.txt"),
		path.Join(outdir, "udevinfo.txt"),
		path.Join(outdir, "ddrescue.log"),
		path.Join(outdir, "ddrescue.dmp"),
	}
	for _, file := range files {
		if _, err := os.Stat(file); !os.IsNotExist(err) {
			return errors.Wrap(os.ErrExist, file)
		}
	}
	return nil
}

func saveSmartctl(device, outPath string) error {
	outdir := path.Dir(outPath)
	smartctlPath := path.Join(outdir, "smartctl.txt")
	commands := []*exec.Cmd{
		exec.Command("date"),
		exec.Command("smartctl", "-s", "on", device),
		exec.Command("smartctl", "-a", device),
	}
	return saveCommands(commands, smartctlPath)
}

func saveUdevinfo(device, outPath string) error {
	outdir := path.Dir(outPath)
	udevinfoPath := path.Join(outdir, "udevinfo.txt")
	commands := []*exec.Cmd{
		exec.Command("date"),
		exec.Command("udevadm", "info", "--query=all", fmt.Sprintf("--name=%s", device)),
	}
	return saveCommands(commands, udevinfoPath)
}

func saveCommands(commands []*exec.Cmd, outPath string) error {
	out, err := os.OpenFile(outPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer out.Close()
	for _, cmd := range commands {
		err := combinedOutput(cmd, out)
		if err != nil {
			return err
		}
	}
	return nil
}

func ddrescue(device, outPath string, totalSize int64) (progress chan string, err error) {
	outdir := path.Dir(outPath)
	ddrescueLogPath := path.Join(outdir, "ddrescue.log")
	ddrescueDmpPath := path.Join(outdir, "ddrescue.dmp")
	commands := []*exec.Cmd{
		exec.Command("ddrescue", device, outPath, ddrescueLogPath, "-r2", "-d"),
	}
	end := make(chan error)      // will close when ddrescue is done
	progress = make(chan string) // will close after end is done
	go func(progress chan string, end <-chan error) {
		defer close(progress)
		getMsg := func() (string, error) {
			stat, err := os.Stat(outPath)
			if err != nil {
				return "", err
			}
			gib := float32(1024 * 1024 * 1024)
			current := float32(stat.Size())
			percent := current / float32(totalSize) * 100.0
			msg := fmt.Sprintf("%1.0f%% (%1.0f GiB/ %1.0f GiB) %1.0f bytes", percent, current/gib, float32(totalSize)/gib, current)
			return msg, err
		}
		for {
			select {
			case err := <-end:
				if err != nil {
					progress <- err.Error()
					return
				}
				msg, err := getMsg()
				if err != nil {
					progress <- err.Error()
					return
				}
				progress <- msg
				return
			case <-time.After(100 * time.Millisecond):
				msg, err := getMsg()
				if err != nil {
					progress <- err.Error()
					continue
				}
				progress <- msg
			}
		}
	}(progress, end)
	go func(end chan error) {
		defer close(end)
		err := saveCommands(commands, ddrescueDmpPath)
		end <- err
	}(end)
	return progress, nil
}

func saveLogs(outPath string) error {
	outdir := path.Dir(outPath)
	files := []string{
		"ddrescue.log",
		"udevinfo.txt",
		"smartctl.txt",
	}
	out, err := os.Create(path.Join(outdir, "imager.log"))
	defer out.Close()
	if err != nil {
		return err
	}
	for _, f := range files {
		b, _ := ioutil.ReadFile(path.Join(outdir, f))
		out.Write(b)
		out.Write([]byte("\n"))
	}
	return nil
}

func setPermissions(outPath string) error {
	outdir := path.Dir(outPath)
	files := []string{
		outPath,
		path.Join(outdir, "ddrescue.dmp"),
		path.Join(outdir, "ddrescue.log"),
		path.Join(outdir, "udevinfo.txt"),
		path.Join(outdir, "smartctl.txt"),
		path.Join(outdir, "imager.log"),
	}
	for _, f := range files {
		err := os.Chmod(f, 0444)
		if err != nil {
			log.Println(err)
		}
	}
	err := os.Chmod(outdir, 0555)
	if err != nil {
		log.Println(err)
	}
	return nil
}
