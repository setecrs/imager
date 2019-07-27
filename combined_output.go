package main

import (
	"io"
	"os/exec"
	"sync"

	"github.com/pkg/errors"
)

func mergeReaders(rs ...io.Reader) io.Reader {
	pr, pw := io.Pipe()
	go func() {
		defer pw.Close()
		wg := sync.WaitGroup{}
		wg.Add(len(rs))
		for _, r := range rs {
			go func(r io.Reader) {
				defer wg.Done()
				_, err := io.Copy(pw, r)
				if err != nil {
					pw.CloseWithError(err)
				}
			}(r)
		}
		wg.Wait()
	}()
	return pr
}

func combinedOutput(cmd *exec.Cmd, out io.Writer) error {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	pr := mergeReaders(stdout, stderr)
	err = cmd.Start()
	if err != nil {
		return err
	}
	_, err = io.Copy(out, pr)
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
	return nil
}
