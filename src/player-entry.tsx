import { Player } from "@remotion/player";
import { createRoot } from "react-dom/client";
import { MyComposition } from "./Composition";
import "./index.css";

const App = () => {
  return (
    <>
      <h1>⚡ Energy Saving Animation</h1>
      <Player
        component={MyComposition}
        durationInFrames={600}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
        style={{
          width: "min(1280px, 100vw - 48px)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,212,255,0.15), 0 24px 80px rgba(0,0,0,0.6)",
        }}
        controls
        autoPlay
        loop
      />
    </>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
