import React, {Fragment, useState, useEffect} from 'react';

const App = () => {
  const [devices, setDevices] = useState([])
  useEffect(() => {
    const ms = 1000
    const interval = setInterval(() => {
      updateDevices(setDevices)
    }, ms)
    return () => { clearInterval(interval)}
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
        {devices.map(x => (
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
              />
              <hr/>
              <DeviceButtons start={(x) => alert(x)}/>
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
    const resp = await fetch('http://localhost:8081/devices/')
    const json = await resp.json()
    setDevices(json)
  })()
}

const DeviceButtons = ({start}) => {
  const [value,setValue] = useState("")
  const [canStart,setCanStart] = useState(false)

  useEffect(()=>{
    setCanStart(value!="")
  }, [value])

  return <div className="container">
    <div className="row">
      <textarea
        rows={5}
        placeholder="path"
        value={value}
        className="col"
        onChange={({target}) => {setValue(target.value.replace(/[\r\n \t]/g,""))}}
        />
    </div>
    <div className="row">
      <button 
        className="btn btn-success" 
        disabled={!canStart}
        onClick={() => start(value)}>Start</button>
    </div>
  </div>
}

const DevicesDetail = ({Devname,Size,PartTableType,PartTableUUID,Vendor,Model,SerialShort,FsUUID}) => (
  <Fragment>
    <h4>{Devname}</h4>
    <div>Size: {Size}</div>
    <div>PartTableType:{PartTableType}</div>
    <div>PartTableUUID:{PartTableUUID}</div>
    <div>Vendor:{Vendor}</div>
    <div>Model:{Model}</div>
    <div>SerialShort:{SerialShort}</div>
    <div>FsUUID:{FsUUID}</div>
  </Fragment>
)


export default App;
