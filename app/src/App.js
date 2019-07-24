import React, { Fragment, useState, useEffect } from 'react';

const App = () => {
  const [devices, setDevices] = useState([])
  useEffect(() => {
    const ms = 1000
    const interval = setInterval(() => {
      updateDevices(setDevices)
    }, ms)
    return () => { clearInterval(interval) }
  }, []) // use [] to run effect only once
  return <Fragment>
    <div className="container">
      <div className="row">
        <h3>Total devices: {devices.length}
        </h3>
      </div>
    </div>
    <div className="container">
      <div className="row">
        {/* <ul className='list-group'> */}
        {devices.sort((x, y) => x.Devname > y.Devname ? 1 : -1).map(x => (
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
              />
              <hr />
              <DeviceButtons
                disabled={x.Running}
                start={({ path, resuming, onError }) => startImager({
                  path,
                  fulldev: x.Devname,
                  resuming,
                  onError,
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


const updateDevices = setDevices => {
  (async () => {
    const resp = await fetch('/devices/')
    const json = await resp.json()
    setDevices(json)
  })()
}

const startImager = ({ path, fulldev, resuming, onError }) => {
  (async () => {
    const shortdev = fulldev.split("/dev/").pop()
    const url = `/devices/${shortdev}/${resuming ? "resume" : "start"}`
    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ path })
    })
    const text = await resp.text()
    if (text) {
      onError(text)
    }
  })()
}

const DeviceButtons = ({ disabled, start }) => {
  const [value, setValue] = useState("")
  const [canStart, setCanStart] = useState(false)
  const [canResume, setCanResume] = useState(false)

  useEffect(() => {
    setCanStart(value !== "" && !disabled)
  }, [value, disabled])

  const onError = (text) => {
    alert(text)
    setCanResume(true)
  }

  return <div className="container">
    <div className="row p-1">
      <FindMaterial
        onFound={({ path }) => {
          if (!path){
            return
          }
          setValue(path.replace(/[\r\n \t]/g, ""))
        }}
        disabled={disabled}
      />
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
        onClick={() => {
          let resuming = false
          if (canResume) {
            if (!window.confirm("Este material já tem imagem. Deseja continuar a cópia?")) { return }
            if (!window.confirm("Tem certeza? Conferiu se é o mesmo material?")) { return }
            if (!window.confirm("Conferiu se os arquivos desta pasta não estão no lugar errado?")) { return }
            resuming = true
          }
          start({ path: value, resuming, onError })
        }}>{canResume ? "Resume" : "Start"}
      </button>
    </div>
  </div>
}

const spinner = <i className="fa fa-spinner fa-spin"></i>

const DevicesDetail = ({ Devname, Size, PartTableType, PartTableUUID, Vendor, Model, SerialShort, FsUUID, Error, Running, Progress }) => (
  <Fragment>
    <h4>{Devname} {Running ? spinner : ""}</h4>
    <div>Size: {Size}</div>
    <div>PartTableType: {PartTableType}</div>
    <div>PartTableUUID: {PartTableUUID}</div>
    <div>Vendor: {Vendor}</div>
    <div>Model: {Model}</div>
    <div>SerialShort: {SerialShort}</div>
    <div>FsUUID: {FsUUID}</div>
    <div>Progress: {Progress}</div>
    {Error ? <div>Error:{JSON.stringify(Error)}</div> : ""}
  </Fragment>
)

const FindMaterial = ({ onFound, disabled }) => {
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
        onClick={() => goFind({ matnum, onFound })}>
        Find
          </button>
    </div>
  </div>
}

const goFind = ({ matnum, onFound }) => {
  (async () => {
    const resp = await fetch(`/find/${matnum}`)
    const json = await resp.json()
    onFound(json)
  })()
}

export default App;
