import React, {Fragment, useState} from 'react';

const App = () => {
  const [devices, setDevices] = useState([])
  return <div>
    <div className="container">
      <div className="row">
        <h3>Total devices: {devices.length}
        </h3>
        <button className="btn" onClick={() => updateDevices(setDevices)()}>Update</button>
      </div>
    </div>
    <div className="container">
      <div className="row">
      <ul className='list-group'>
        {devices.map(x => (
          <li key={x.Devname} className='list-group-item'>
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
            <DeviceButtons finder={(x) => alert(x)}/>
          </li>
        ))}
      </ul>
      </div>
    </div>
  </div>
}


const updateDevices = setDevices => async () => {
  const resp = await fetch('http://localhost:8081/api/')
  const json = await resp.json()
  setDevices(json)
}



const DeviceButtons = ({finder}) => {
  const [value,setValue] = useState("")
  return <Fragment>
    <input
      type="text"
      placeholder="M190000"
      value={value}
      onChange={({target}) => {setValue(target.value)}}
      />
    <button onClick={() => finder(value)}>Find</button>
  </Fragment>
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
