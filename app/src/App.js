import React, { Fragment, useState, useEffect } from 'react';

const App = () => {
  const [devices, setDevices] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const ms = 1000
    const interval = setInterval(() => {
      updateDevices({ setDevices, setConnected })
    }, ms)
    return () => { clearInterval(interval) }
  }, []) // use [] to run effect only once
  return <Fragment>
    <div className="container">
      <div className="row">
        <h3>Total devices: {devices.length}
        </h3>
      </div>
      {(connected) ?
        <Fragment />
        :
        <div className="row">
          <span style={{ color: 'red' }}>not connected</span>
        </div>
      }
    </div>
    <div className="container">
      <div className="row">
        {/* <ul className='list-group'> */}
        {devices.sort((x, y) => x.AddTime > y.AddTime ? 1 : -1).map(x => (
          <div key={x.Devname} className='col-12 col-md-6 p-3 border rounded'>
            <div className="container">
              <DevicesDetail
                Devname={x.Devname}
                Size={x.Size}
                PartTableType={x.PartTableType}
                PartTableUUID={x.PartTableUUID}
                Vendor={x.Vendor}
                Model={x.Model}
                SerialShort={x.SerialShort}
                FsUUID={x.FsUUID}
                Error={x.Error}
                Running={x.Running}
                Progress={x.Progress}
                Path={x.Path}
                AddTime={x.AddTime}
              />
              <hr />
              <DeviceButtons
                disabled={x.Running}
                start={({ path, resuming, onError }) => startImager({
                  path,
                  fulldev: x.Devname,
                  resuming,
                })}
              />
            </div>
          </div>
        ))}
        {/* </ul> */}
      </div>
    </div>
  </Fragment>
}


const updateDevices = ({ setDevices, setConnected }) => {
  (async () => {
    try {
      const resp = await fetch('/devices/')
      const json = await resp.json()
      setConnected(true)
      setDevices(json)
    } catch (e) {
      setConnected(false)
      throw e
    }
  })()
}

const startImager = async ({ path, fulldev, resuming }) => {
  const shortdev = fulldev.split("/dev/").pop()
  const url = `/devices/${shortdev}/${resuming ? "resume" : "start"}`
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ path })
  })
  const text = await resp.text()
  if (text) {
    throw text
  }
}

const DeviceButtons = ({ disabled, start }) => {
  const [value, setValue] = useState("")
  const [canStart, setCanStart] = useState(false)
  const [canResume, setCanResume] = useState(false)
  const [findError, setFindError] = useState("")

  useEffect(() => {
    setCanStart(value !== "" && !disabled)
    setCanResume(false)
  }, [value, disabled])

  const onError = (text) => {
    alert(text)
    if (text.trim().endsWith("already exists")) {
      setCanResume(true)
    }
  }

  return <div className="container">
    <div className="row p-1">
      <FindMaterial
        onFound={({ path }) => {
          if (!path) {
            return
          }
          setValue(path.replace(/[\r\n \t]/g, ""))
        }}
        disabled={disabled}
        setFindError={setFindError}
      />
      {(findError)?
      <span style={{color: 'red'}}>{findError}</span>
      :
      <Fragment />
      }
    </div>
    <div className="row p-1">
      <textarea
        rows={5}
        placeholder="path"
        value={value}
        className="col"
        disabled={disabled}
        onChange={({ target }) => { setValue(target.value.replace(/[\r\n \t]/g, "")) }}
      />
    </div>
    <div className="row p-1">
      <button
        className="btn btn-success"
        disabled={!canStart}
        onClick={async () => {
          setFindError("")
          try {
            let resuming = false
            if (canResume) {
              if (!window.confirm("Este material já tem imagem. Deseja continuar a cópia?")) { return }
              if (!window.confirm("Tem certeza? Conferiu se é o mesmo material?")) { return }
              if (!window.confirm("Conferiu se os arquivos desta pasta não estão no lugar errado?")) { return }
              resuming = true
            }
            await start({ path: value, resuming, onError })
            setCanResume(false)
          } catch (e) {
            onError(e)
          }
        }}>{canResume ? "Resume" : "Start"}
      </button>
    </div>
  </div>
}

const spinner = <i className="fa fa-spinner fa-spin"></i>

const DevicesDetail = ({ Devname, Size, PartTableType, PartTableUUID, Vendor, Model, SerialShort, FsUUID, Error, Running, Progress, Path, AddTime }) => (
  <Fragment>
    <h4>{Devname} {Running ? spinner : ""}</h4>
    <h5>{AddTime.split(".")[0]} </h5>
    <div>Size: {Number(Size) * 512} bytes ({(Number(Size) / 2 / 1024 / 1024).toFixed(2)} GiB)</div>
    <div>PartTableType: {PartTableType}</div>
    <div>PartTableUUID: {PartTableUUID}</div>
    <div>Vendor: {Vendor}</div>
    <div>Model: {Model}</div>
    <div>SerialShort: {SerialShort}</div>
    <div>FsUUID: {FsUUID}</div>
    <div>Progress: {Progress}</div>
    <div>Path: {Path} </div>
    {Error ? <div>Error:{JSON.stringify(Error)}</div> : ""}
  </Fragment>
)

const FindMaterial = ({ onFound, disabled, setFindError }) => {
  const [matnum, setMatnum] = useState("")
  return <div className="input-group">
    <input
      className="form-control"
      placeholder="Ex: M190001"
      value={matnum}
      disabled={disabled}
      onChange={({ target }) => { setMatnum(target.value.replace(/[\r\n \t]/g, "")) }}
    />
    <div className="input-group-append">
      <button
        className="btn btn-outline-secondary"
        disabled={disabled}
        onClick={() => goFind({ matnum, onFound, setFindError})}>
        Find
          </button>
    </div>
  </div>
}

const goFind = ({ matnum, onFound, setFindError}) => {
  (async () => {
    setFindError("")
    try{
      const resp = await fetch(`/find/${matnum}`)
      const json = await resp.json()
      onFound(json)
    } catch (e){
      setFindError("Error searching: " + e.toString())
    }
  })()
}

export default App;
