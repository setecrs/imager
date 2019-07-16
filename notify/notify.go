package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
)

type Message struct {
	Devname       string
	Action        string
	Size          string
	PartTableType string
	PartTableUUID string
	Vendor        string
	Model         string
	SerialShort   string
	FsUUID        string
}

func main() {
	size := "0"
	if len(os.Args) > 2 {
		size = os.Args[2]
	}

	msg := Message{
		Devname:       os.Getenv("DEVNAME"),
		Action:        os.Getenv("ACTION"),
		Size:          size,
		PartTableType: os.Getenv("ID_PART_TABLE_TYPE"),
		PartTableUUID: os.Getenv("ID_PART_TABLE_UUID"),
		Vendor:        os.Getenv("ID_VENDOR"),
		Model:         os.Getenv("ID_MODEL"),
		SerialShort:   os.Getenv("ID_SERIAL_SHORT"),
		FsUUID:        os.Getenv("ID_FS_UUID"),
	}
	b, _ := json.Marshal(msg)
	http.Post(os.Args[1], "application/json", bytes.NewBuffer(b))
}
