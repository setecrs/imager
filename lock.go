package main

import (
	"io"
	"os"
	"syscall"
)

type lock struct {
	fd       int
	lockPath string
}

func (l lock) Close() error {
	err := syscall.Flock(l.fd, syscall.LOCK_UN)
	if err != nil {
		return err
	}
	err = syscall.Close(l.fd)
	if err != nil {
		return err
	}
	err = os.Remove(l.lockPath)
	return err
}

// GetLock creates a file with an exclusive lock
// The file is removed when the lock is released by Close()
func GetLock(path string) (io.Closer, error) {
	l := lock{}
	fd, err := syscall.Open(path, syscall.O_CREAT|syscall.O_WRONLY, 0700)
	l.fd = fd
	l.lockPath = path
	if err != nil {
		return l, err
	}
	err = syscall.Flock(l.fd, syscall.LOCK_EX|syscall.LOCK_NB)
	if err != nil {
		syscall.Close(l.fd)
		return l, err
	}
	return l, nil
}
