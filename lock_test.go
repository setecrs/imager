package main

import (
	"fmt"
	"path/filepath"
)

func ExampleGetLock() {
	check := func(err error) {
		if err != nil {
			fmt.Println(err)
		}
	}
	lock, err := GetLock("/tmp/a.lock")
	check(err)
	defer lock.Close()

	files, err := filepath.Glob("/tmp/*.lock")
	check(err)
	fmt.Println(files)

	lock2, err := GetLock("/tmp/a.lock")
	check(err)
	defer lock2.Close()
	lock2.Close()

	files, err = filepath.Glob("/tmp/*.lock")
	check(err)
	fmt.Println(files)

	lock.Close()

	files, err = filepath.Glob("/tmp/*.lock")
	check(err)
	fmt.Println(files)

	// Output:
	// [/tmp/a.lock]
	// resource temporarily unavailable
	// [/tmp/a.lock]
	// []
}
