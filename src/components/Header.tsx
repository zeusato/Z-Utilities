import React from "react";
import { Link } from "react-router-dom";
// import QuickTranslateButton from "../Tools/Buttons/QuickTranslateButton";
import XChangeButton from "../Tools/Buttons/XChangeButton";
import WeatherButton from "../Tools/Buttons/WeatherButton";
import LOGO from "../../img/Logo.png";


export default function Header() {  
  return (
    <header className="sticky top-0 z-40">
      <div
        className="
                  px-4 md:px-6 py-3 transition
                  bg-transparent backdrop-blur-0 border-transparent
                  hover:bg-white/15 hover:backdrop-blur-md hover:border-white/30
                  focus-within:bg-white/5 focus-within:backdrop-blur-md focus-within:border-white/5
                  "
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={LOGO} alt="Zeusato" className="h-10 w-auto mt-1 mb-1" />
            <span className="font-bold tracking-wide">Utilities</span>
          </Link>
          <nav className="ml-auto flex items-center gap-3">
            <XChangeButton label="XChange" portalSelector="body" />
            {/* <QuickTranslateButton label="Dịch nhanh" /> */}
            <WeatherButton label="Thời tiết" portalSelector="body" />
          </nav>
        </div>
      </div>
    </header>
  );
}
