import "./App.css";
import Header from "/src/components/Header";
import ReachMap from "/src/components/ReachMap";
import CityScope from "./components/CityScope";
import Impressum from "/src/components/Impressum";
import "leaflet/dist/leaflet.css";
import { Routes, Route } from "react-router";

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/reachmap" element={<ReachMap />} />
        <Route path="/cityscope" element={<CityScope />} />
        <Route path="/impressum" element={<Impressum />} />
      </Routes>
    </>
  );
}

export default App;
