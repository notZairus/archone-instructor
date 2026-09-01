import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

const CircularBar = ({ score }: { score: number }) => {
  return (
    <>
      <div className="relative p-1">
        <CircularProgressbar
          className="m-2"
          value={score}
          styles={buildStyles({
            pathTransitionDuration: 0.5,
            pathColor: `#F56565`,
            textColor: "#f88",
            trailColor: "#d6d6d6",
            backgroundColor: "red",
          })}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-2xl font-bold text-center -mb-1">{score}</p>
          <p className="font-semibold text-lg text-center">/ 100</p>
        </div>
      </div>
    </>
  );
};

export default CircularBar;
