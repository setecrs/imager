package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/pkg/errors"

	"github.com/gorilla/mux"
)

//Device struct holds information provided by UDEV
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
	Error         string
	Running       bool
	Progress      string
	AddTime       time.Time
}

type Config struct {
	Devices    map[string]*Device
	GraphqlURL string
}

func main() {
	cnf := Config{
		Devices: make(map[string]*Device),
	}
	udevListen := "localhost:8080"
	if s, ok := os.LookupEnv("UDEV_LISTEN"); ok {
		udevListen = s
	}
	listen := "localhost:8081"
	if s, ok := os.LookupEnv("LISTEN"); ok {
		listen = s
	}
	cnf.GraphqlURL = os.Getenv("GRAPHQL_URL")

	r := mux.NewRouter()
	r.HandleFunc("/", cnf.udevHandler)
	go http.ListenAndServe(udevListen, r)

	r2 := mux.NewRouter()
	r2.StrictSlash(true)
	r2.HandleFunc("/devices/{device}/resume", cnf.startHandler).Methods("POST")
	r2.HandleFunc("/devices/{device}/start", cnf.startHandler).Methods("POST")
	r2.HandleFunc("/devices/{device}", cnf.deviceHandler).Methods("GET")
	r2.HandleFunc("/devices", cnf.listDevicesHandler).Methods("GET")
	r2.HandleFunc("/find/{material}", cnf.findMaterialHandler).Methods("GET")
	r2.PathPrefix("/").Handler(http.FileServer(http.Dir("app/build")))
	log.Fatal(http.ListenAndServe(listen, r2))
}
func (cnf *Config) startHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	resuming := strings.HasSuffix(r.URL.Path, "resume")
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
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "could not read body request: %v", err)
		return
	}
	data := struct {
		Path string
	}{}
	err = json.Unmarshal(b, &data)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "could not parse json body: %v", err)
		return
	}
	totalSize, err := strconv.Atoi(d.Size)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "device size is wrong: %v", d.Size)
		return
	}
	totalSize *= 512
	d.Running = true
	d.Error = ""
	progress, chanErr, err := startImager(d.Devname, data.Path, int64(totalSize), resuming)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "error in startImager: %v", err)
		d.Running = false
		return
	}
	go func(progress chan string, d *Device) {
		for s := range progress {
			d.Progress = s
		}
	}(progress, d)
	go func(chanErr chan error, d *Device) {
		d.Error = ""
		for err := range chanErr {
			d.Error = err.Error()
		}
		d.Running = false
	}(chanErr, d)
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
		devs = append(devs, *v)
	}
	b, err := json.Marshal(devs)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "error in encodin json: %v", err)
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
		return
	}
	q := fmt.Sprintf(`query{
		board(title:"%s"){
		  lists{
			card(title:"%s"){
			  title
			  customFields{
				customField{name}
				value
			  }
			}
		  }
		}
	  }
	`, "Materiais", material)
	d := struct {
		Data struct {
			Board struct {
				Lists []struct {
					Card struct {
						Title        string
						CustomFields []struct {
							CustomField struct {
								Name string
							}
							Value string
						}
					}
				}
			}
		}
		Errors []struct {
			Message string
		}
	}{}
	err := cnf.query(q, &d)
	if err != nil {
		log.Printf("error in query: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "error in query: %v", err)
		return
	}
	if len(d.Errors) > 0 {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "graphql error: %v", d.Errors[0].Message)
		return
	}
	result := ""
	for _, l := range d.Data.Board.Lists {
		for _, cf := range l.Card.CustomFields {
			if cf.CustomField.Name == "path" {
				if cf.Value != "" {
					result = cf.Value
				}
			}
		}
	}
	data := struct {
		Path string `json:"path"`
	}{
		result,
	}
	err = json.NewEncoder(w).Encode(&data)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, "error encoding json: %v", err)
		return
	}
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
		d.AddTime = time.Now()
		cnf.Devices[d.Devname] = &d
	case "remove":
		delete(cnf.Devices, d.Devname)
	default:
		log.Printf("action not known: '%s'\n", d.Action)
	}
}

func (cnf Config) query(q string, v interface{}) error {
	if cnf.GraphqlURL == "" {
		return fmt.Errorf("GRAPHQL_URL not set")
	}
	r, err := http.Post(cnf.GraphqlURL, "application/graphql", strings.NewReader(q))
	if err != nil {
		return errors.Wrap(err, "error doing http.Post")
	}
	defer r.Body.Close()
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return errors.Wrap(err, "error reading body")
	}
	err = json.Unmarshal(b, v)
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("error decoding json: %v, q:%v", string(b), q))
	}
	return nil
}
