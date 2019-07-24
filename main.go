package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"unicode"

	"github.com/gorilla/mux"
)

type Device struct {
	Devname       string
	Action        string
	Size          string
	PartTableType string
	PartTableUUID string
	Vendor        string
	Model         string
	SerialShort   string
	FsUUID        string
	Percent       int
	Error         error
}

type Config struct {
	Devices map[string]Device
}

func main() {
	cnf := Config{
		Devices: make(map[string]Device),
	}
	udevListen := "localhost:8080"
	if s, ok := os.LookupEnv("UDEV_LISTEN"); ok {
		udevListen = s
	}
	port := "localhost:8081"
	if s, ok := os.LookupEnv("PORT"); ok {
		port = s
	}
	r := mux.NewRouter()
	r.HandleFunc("/", cnf.udevHandler)
	go http.ListenAndServe(udevListen, r)

	r2 := mux.NewRouter()
	r2.StrictSlash(true)
	r2.HandleFunc("/devices/{device}/start", cnf.startHandler).Methods("POST")
	r2.HandleFunc("/devices/{device}", cnf.deviceHandler).Methods("GET")
	r2.HandleFunc("/devices", cnf.listDevicesHandler).Methods("GET")
	r2.HandleFunc("/find/{material}", cnf.findMaterialHandler).Methods("GET")
	r2.PathPrefix("/").Handler(http.FileServer(http.Dir("app/build")))
	log.Fatal(http.ListenAndServe(port, r2))
}
func (cnf *Config) startHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	device, ok := mux.Vars(r)["device"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("could not decode parameter from request: device"))
		return
	}
	d, ok := cnf.Devices["/dev/"+device]
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "could not read body request: %v", err)
		return
	}
	data := struct {
		Path string
	}{}
	err = json.Unmarshal(b, &data)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "could not parse json body: %v", err)
		return
	}
	progress, chanErr, err := startImager(d.Devname, data.Path)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "error in startImaging: %v", err)
		return
	}
	go func(progress chan int, d *Device) {
		for i := range progress {
			d.Percent = i
		}
	}(progress, &d)
	go func(chanErr chan error, d *Device) {
		d.Error = nil
		for err := range chanErr {
			d.Error = err
		}
	}(chanErr, &d)
	return
}

func (cnf *Config) deviceHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	device, ok := mux.Vars(r)["device"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("could not decode parameter from request: device"))
		return
	}
	d, ok := cnf.Devices["/dev/"+device]
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(d)
}

func (cnf *Config) listDevicesHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	devs := []Device{}
	for _, v := range cnf.Devices {
		devs = append(devs, v)
	}
	b, err := json.Marshal(devs)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Write(b)
}

func (cnf *Config) findMaterialHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	material, ok := mux.Vars(r)["material"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("could not decode parameter from request: material"))
	}
	log.Println("findMaterial", material)
}

func (cnf *Config) udevHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	d := Device{}
	err := json.NewDecoder(r.Body).Decode(&d)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	cnf.processDevice(d)
}

func (cnf *Config) processDevice(d Device) {
	if d.Devname == "" {
		return
	}
	runes := []rune(d.Devname)
	last := runes[len(runes)-1]
	if unicode.IsDigit(last) {
		// is a partition
		return
	}
	switch d.Action {
	case "add", "change":
		cnf.Devices[d.Devname] = d
	case "remove":
		delete(cnf.Devices, d.Devname)
	default:
		log.Printf("action not known: '%s'\n", d.Action)
	}
}
