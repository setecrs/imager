package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"

	"github.com/pkg/errors"
)

func startImager(device, outPath string) (progress chan int, chanErr chan error, err error) {
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
	err = checkDuplicateImaging(device, outPath)
	if err != nil {
		return nil, nil, err
	}
	err = saveSmartctl(device, outPath)
	if err != nil {
		return nil, nil, err
	}
	err = saveUdevinfo(device, outPath)
	if err != nil {
		return nil, nil, err
	}
	err = saveComands([]*exec.Cmd{
		exec.Command("bash", "-c", "seq 1 4 | while read i; do echo $i; sleep 1; done"),
	}, "/tmp/1/teste.txt")
	if err != nil {
		return nil, nil, err
	}
	c, err := ddrescue(device, outPath)
	if err != nil {
		return nil, nil, err
	}
	progress = make(chan int)
	chanErr = make(chan error)
	go func(c <-chan int, progress chan int, chanErr chan error) {
		defer close(chanErr)
		for i := range c {
			progress <- i
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
	}(c, progress, chanErr)
	return progress, chanErr, nil
}
func prepareDir(outPath string) error {
	outdir := path.Dir(outPath)
	err := os.MkdirAll(outdir, 0755)
	return err
}

func saveSmartctl(device, outPath string) error {
	outdir := path.Dir(outPath)
	smartctlPath := path.Join(outdir, "smartctl.txt")
	commands := []*exec.Cmd{
		exec.Command("date"),
		exec.Command("smartctl", "-s", "on", device),
		exec.Command("smartctl", "-a", device),
	}
	return saveComands(commands, smartctlPath)
}

func saveUdevinfo(device, outPath string) error {
	outdir := path.Dir(outPath)
	udevinfoPath := path.Join(outdir, "udevinfo.txt")
	commands := []*exec.Cmd{
		exec.Command("date"),
		exec.Command("udevadm", "info", "--query=all", fmt.Sprintf("--name=%s", device)),
	}
	return saveComands(commands, udevinfoPath)
}

func saveComands(commands []*exec.Cmd, outPath string) error {
	out, err := os.OpenFile(outPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer out.Close()
	for _, cmd := range commands {
		var b bytes.Buffer
		cmd.Stdout = &b
		cmd.Stderr = &b
		err := cmd.Start()
		_, err = io.Copy(out, bufio.NewReader(&b))
		if err != nil {
			return err
		}
		err = cmd.Wait()
		if err != nil {
			if _, ok := err.(*exec.ExitError); ok {
				// ignore exit status != 0
			} else {
				return errors.Wrap(err, "error executing command")
			}
		}
		_, err = io.Copy(out, bufio.NewReader(&b))
		if err != nil {
			return err
		}
	}
	return nil
}

func ddrescue(device, outPath string) (progress chan int, err error) {
	outdir := path.Dir(outPath)
	ddrescueLogPath := path.Join(outdir, "ddrescue.log")
	ddrescueDmpPath := path.Join(outdir, "ddrescue.dmp")
	commands := []*exec.Cmd{
		exec.Command("ddrescue", device, outPath, ddrescueLogPath, "-r2", "-d"),
	}
	progress = make(chan int)
	defer close(progress)
	return progress, saveComands(commands, ddrescueDmpPath)
}

func saveLogs(outPath string) error {
	// _imager.log(){
	// 	FILES="cd-info.txt read-toc.txt toc.txt ddrescue.log hashlog.* udevinfo.txt camcontrol.txt smartctl.txt dadoshd.txt ewfinfo.txt"
	// 	(
	// 	  cd "${OUTDIR}"
	// 	  for f in `ls $FILES 2>/dev/null `
	// 	  do
	// 		echo '#######################'
	// 		echo $f
	// 		echo '#######################'
	// 		cat $f
	// 	  done | dd of=imager.log
	// 	)
	// 	}
	return fmt.Errorf("not implemented")
}

func setPermissions(outPath string) error {
	// _permissions(){
	// 	chmod a-w "${OUTFILE}" "${OUTDIR}"/*.*
	// 	chmod a+rX "${OUTDIR}"
	// 	}
	return fmt.Errorf("not implemented")
}

func checkDuplicateImaging(device, outPath string) error {
	if _, err := os.Stat(outPath); !os.IsNotExist(err) {
		return os.ErrExist
	}
	return nil
}
