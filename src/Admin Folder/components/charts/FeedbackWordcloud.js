import React, { useEffect, useRef, useState } from "react";
import WordCloud from "wordcloud";

const FeedbackWordCloud = ({ words }) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        setDimensions({
          width: canvasRef.current.parentElement.offsetWidth,
          height: canvasRef.current.parentElement.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (canvasRef.current && words.length > 0) {
      // Clear previous word cloud
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      WordCloud(canvasRef.current, {
        list: words.map(({ text, value }) => [text, value]),
        gridSize: Math.round(dimensions.width / 50), // Dynamic grid size
        weightFactor: (dimensions.width / 40), // Adjust word size dynamically
        fontFamily: "Arial",
        color: () => "#" + Math.floor(Math.random() * 16777215).toString(16), // Random colors
        backgroundColor: "#ffffff",
        rotateRatio: 0.3, // Control rotation of words
      });
    }
  }, [words, dimensions]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

export default FeedbackWordCloud;
