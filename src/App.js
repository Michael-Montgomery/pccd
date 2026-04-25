import './App.css';
import { useState, useRef } from 'react';
import Papa from "papaparse";
import dayjs from "dayjs";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import geoData from "./geo/Zip_Codes.json";
import html2pdf from "html2pdf.js";


// let zipPolygons = geoData.features;

const includedZipCodes = ["19119", "19120", "19126", "19138", "19140", "19141", "19144", "19150"]; // strings (GeoJSON uses strings)

const zipPolygons = geoData.features.filter(f =>
  includedZipCodes.includes(f.properties.CODE)
);

console.log("Available zip codes in data:", geoData.features.map(f => f.properties.CODE));
console.log("Filtered zip polygons:", zipPolygons.map(f => f.properties.CODE));



function getZipForPoint(lat, lng, zipPolygons) {
  const pt = point([lng, lat]);
  console.log(`Checking point (${lat}, ${lng}) against zip polygons...`);
  const match = zipPolygons.find((zip) =>
    booleanPointInPolygon(pt, zip)
  );
  console.log(`Match for point (${lat}, ${lng}):`, match ? match.properties.CODE : "No match");

  return match ? match.properties.CODE : null;
}

console.log(
  "Available ZIPs:",
  geoData.features.length
);


function App() {
  const [dataFilter, setDataFilter] = useState("30");


  const [data, setData] = useState([]);
  const [dataCopy, setDataCopy] = useState([]);
  const [showZipBreakdown, setShowZipBreakdown] = useState(true);
  const [startDate, setStartDate] = useState(dayjs().subtract(120, "day").format("MM-DD-YYYY"));
  const [endDate, setEndDate] = useState(dayjs().format("MM-DD-YYYY"));
  const [showExportButton, setShowExportButton] = useState(false);


  const pdfRef = useRef();

  const handleDownload = () => {
    const element = pdfRef.current;

    const options = {
      margin: 0.5,
      filename: "PCCD Quarterly Reporting (gun violence stats).pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 3 }, // better quality
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"]
      }
    };

    html2pdf().set(options).from(element).save();
  };




  const handleCSVFileUpload = (event) => {
    const file = event.target.files[0];

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setDataCopy(results.data);
        const filteredData = results.data.filter((item) => {
          const itemDate = dayjs(item.date_);
          const currentDate = dayjs();
          return currentDate.diff(itemDate, "day") <= 120;
        });
        const enrichedData = filteredData.map((item) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lng);

          if (isNaN(lat) || isNaN(lng) || lat < 39 || lat > 41 || lng < -76 || lng > -74) {
            console.warn(`Invalid coordinates for item: lat=${lat}, lng=${lng}`);
            return {
              ...item,
              zip: null,
              inIncludedZip: false,
              error: "Invalid coordinates"
            };
          }

          const zip = getZipForPoint(lat, lng, zipPolygons);

          return {
            ...item,
            zip: zip,
            inIncludedZip: !!zip, // Convert to boolean
          };
        });
        console.log("Enriched Data:", enrichedData);
        setData(enrichedData);
        setShowExportButton(true);
      },
    });
  };

  const handleDateFilterChange = (value) => {
    setDataFilter(value);
    const filteredData = data.filter(item => {
      const itemDate = dayjs(item.date_);
      // console.log(itemDate);
      const currentDate = dayjs();
      return currentDate.diff(itemDate, 'day') <= parseInt(value);
    });
    console.log(`Filtered Data for past ${value} days:`, filteredData.length);
    console.log(filteredData);
    setData(filteredData);
  }



  return (
    <>

      <div className='controls-wrapper'>
        <div className='file-upload-wrapper'>
          <form>
            <input type='file' name='file' id='file' onChange={handleCSVFileUpload} />
          </form>
        </div>
        <div className='date-inputs'>
          <label htmlFor='startDate'>Start Date:</label>
          <input
            type='date'
            id='startDate'
            placeholder='Start Date'
            // onBlur={(e) => {
            //   const selectedDate = dayjs(e.target.value);
            //   setDataCopy(dataCopy); // Reset to original data before applying new filter
            //   setStartDate(selectedDate.format("MM-DD-YYYY"));
            //   const filteredData = dataCopy.filter(item => {
            //     const itemDate = dayjs(item.date_);
            //     return itemDate.isAfter(selectedDate);
            //   });
            //   setData(filteredData);
            // }}
            onBlur={(e) => {
              const selectedDate = dayjs(e.target.value);
              setDataCopy(dataCopy); // Reset to original data before applying new filter
              if (e.target.value && selectedDate.isValid()) {
                setStartDate(selectedDate);
                const filteredData = dataCopy.filter(item => {
                  const itemDate = dayjs(item.date_);
                  return itemDate.isAfter(selectedDate) || itemDate.isSame(selectedDate, 'day');
                });
                setData(filteredData);
              }
            }}
          />
          <label htmlFor='endDate'>End Date:</label>
          <input
            type='date'
            id='endDate'
            placeholder='End Date'
            // onChange={(e) => {
            //   const selectedDate = dayjs(e.target.value);
            //   setDataCopy(dataCopy); // Reset to original data before applying new filter
            //   setEndDate(selectedDate.format("MM-DD-YYYY"));
            //   const filteredData = dataCopy.filter(item => {
            //     const itemDate = dayjs(item.date_);
            //     return itemDate.isBefore(selectedDate);
            //   });
            //   setData(filteredData);
            // }}
            onBlur={(e) => {
              const selectedDate = dayjs(e.target.value);
              setDataCopy(dataCopy); // Reset to original data before applying new filter
              if (e.target.value && selectedDate.isValid()) {
                setEndDate(selectedDate);
                const filteredData = dataCopy.filter(item => {
                  const itemDate = dayjs(item.date_);
                  return itemDate.isBefore(selectedDate) || itemDate.isSame(selectedDate, 'day');
                });
                console.log(`Filtered Data for end date ${selectedDate.format("MM-DD-YYYY")}:`, filteredData);
                setData(filteredData);
              }
            }}
          />
        </div>

        <div className='options-wrapper'>
          {/* <select onChange={(e) => handleDateFilterChange(e.target.value)}>
          <option value='0'>All Data</option>
        <option value='30'>Past 30 days</option>
          <option value='90'>Past 3 Months</option>
          <option value='180'>Past 6 Months</option>
        </select> */}
          <input
            type='checkbox'
            id='zipBreakdown'
            checked={showZipBreakdown}
            onChange={() => setShowZipBreakdown(!showZipBreakdown)}
          />
          <label htmlFor='zipBreakdown'>Show ZIP Code Breakdown</label>
        </div>

        {
          showExportButton && (
            <button className='export-btn' onClick={handleDownload}>Export</button>
          )
        }


      </div>
      <div ref={pdfRef} className='report-wrapper'>
        <h2 className='report-title'>PCCD Quarterly Reporting (gun violence stats)</h2>
        <p className='report-dates'>{`Report for dates: ${startDate} - ${endDate}`}</p>
        <div className='data-list-wrapper'>
          {showZipBreakdown &&
            includedZipCodes.map(zip => {
              const incidentsByZip = data.filter(item => item.zip === zip).sort((a, b) => dayjs(b.date_).diff(dayjs(a.date_))); // Sort by date descending
              return (

                <div key={zip} className='data-item'>
                  <h6>{zip}</h6>
                  <table className='zip-table'>
                    <tr>
                      <th>Incidents:</th>
                      <td>{incidentsByZip.length || 0}</td>
                    </tr>
                    <tr>
                      <th>Fatalities:</th>
                      <td>{incidentsByZip.filter(val => val.fatal === "1").length || 0}</td>
                    </tr>
                  </table>
                  {incidentsByZip.length > 0 &&
                    <table className='zip-incident-table no-break'>
                      <tr>
                        <th>Date</th>
                        <th>Address</th>
                        <th>Fatal?</th>
                      </tr>
                      {incidentsByZip.map((incident, index) => (
                        <tr key={index}>
                          <td>{incident.date_}</td>
                          <td>{`${incident.location} Philadelphia, PA ${incident.zip}`}</td>
                          <td>{incident.fatal === "1" ? "Yes" : "No"}</td>

                        </tr>
                      ))}
                    </table>}
                </div>
              );
            })
          }
          <div className='totals'>
            <h2>Totals for included zip codes</h2>
            {/* <p>Total Incidents: {data.filter(incident => includedZipCodes.includes(incident.zip)).length}</p>
          <p>Total Fatalities: {data.filter(incident => includedZipCodes.includes(incident.zip) && incident.fatal === "1").length}</p> */}
            <table className='zip-table'>
              <tr>
                <th>Incidents:</th>
                <td>{data.filter(incident => includedZipCodes.includes(incident.zip)).length}</td>
              </tr>
              <tr>
                <th>Fatalities:</th>
                <td>{data.filter(incident => includedZipCodes.includes(incident.zip) && incident.fatal === "1").length}</td>
              </tr>
            </table>
            <table className='zip-incident-table'>
              <tr>
                <th>Date</th>
                <th>Address</th>
                <th>Fatal?</th>
              </tr>
              {data.filter(incident => includedZipCodes.includes(incident.zip)).sort((a, b) => dayjs(b.date_).diff(dayjs(a.date_))).map((incident, index) => (
                <tr key={index}>
                  <td>{incident.date_}</td>
                  <td>{`${incident.location} Philadelphia, PA ${incident.zip}`}</td>
                  <td>{incident.fatal === "1" ? "Yes" : "No"}</td>

                </tr>
              ))}
            </table>
          </div>
        </div>

      </div>

    </>
  );
}

export default App;


// Report title: PCCD Quartly Reporting (gun violence stats)
