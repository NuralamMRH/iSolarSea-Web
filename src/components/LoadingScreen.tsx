import React from "react";

interface LoadingScreenProps {
  isLoading?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading = true }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        <img
          src="/images/top/fly.svg"
          alt="satellite"
          className="mainvisual__move1 mainvisual__move1--loading"
        />
        <img
          src="/images/top/fly.svg"
          alt="satellite"
          className="mainvisual__move2 mainvisual__move2--loading"
        />
        <img
          src="/images/common_img/logo_blue.svg"
          className="loading-screen__logo"
          alt="itrucksea"
          width="218"
          height="218"
        />
      </div>
    </div>
  );
};

export default LoadingScreen;
