package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
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
}

type Config struct {
	Devices    map[string]Device
	UdevListen string
	Port       string
}

func main() {
	cnf := Config{
		Devices:    make(map[string]Device),
		UdevListen: "localhost:8080",
		Port:       "localhost:8081",
	}
	cnf.Devices["sdh"] = Device{
		Devname: "/dev/sdh",
		Size:    "10",
	}
	if udevListen, ok := os.LookupEnv("UDEV_LISTEN"); ok {
		cnf.UdevListen = udevListen
	}
	r := mux.NewRouter()
	r.HandleFunc("/", cnf.udevHandler)
	go http.ListenAndServe(cnf.UdevListen, r)

	r2 := mux.NewRouter()
	r2.HandleFunc("/devices/{device}/{action}", cnf.actionHandler)
	r2.HandleFunc("/devices/{device}", cnf.deviceHandler)
	r2.HandleFunc("/devices/", cnf.listDevicesHandler)
	r2.HandleFunc("/materiais/{id}", cnf.listMateriaisHandler)
	r2.PathPrefix("/").Handler(http.FileServer(http.Dir("frontend")))
	log.Fatal(http.ListenAndServe(cnf.Port, r2))
}
func (cnf *Config) actionHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	log.Println("action")
}

func (cnf *Config) deviceHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	log.Println("device")
}

func (cnf *Config) listMateriaisHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := mux.Vars(r)["id"]
	q := fmt.Sprintf(`
	query{
		board(title:"Materiais") {
		  customFields{
			id: _id
			name
		  }
		  lists {
			card(title:"%s"){
				id: _id
				title
				labelIds
				customFields{
					id: _id
					value
				}
			}
		  }
		}
	  }
	`, id)
	d := struct {
		Errors []struct {
			Message string
		}
		Data struct {
			Boards []struct {
				CustomFields []struct {
					ID   string
					Name string
				}
				Lists []struct {
					Cards struct {
						ID           string
						Title        string
						CustomFields []struct {
							ID    string
							Value string
						}
					}
				}
			}
		}
	}{}
	err := cnf.query(q, &d)
	if err != nil {
		log.Printf("error in query: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if len(d.Errors) > 0 {
		log.Printf("graphql error: %v", d.Errors[0].Message)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	resp := struct {
		ID    string
		Title string
		Path  string
	}{}
	b, err := json.Marshal(resp)
	if err != nil {
		log.Printf("error making json: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Write(b)
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

func (cnf *Config) query(q string, v interface{}) error {
	// log.Println(q)
	r, err := http.Post(cnf.GraphqlURL, "application/graphql", strings.NewReader(q))
	if err != nil {
		return err
	}
	defer r.Body.Close()
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return err
	}
	err = json.Unmarshal(b, v)
	if err != nil {
		return err
	}
	return nil
}
