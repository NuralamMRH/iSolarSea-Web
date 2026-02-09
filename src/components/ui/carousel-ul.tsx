import * as React from "react";
import { CSSProperties } from "react";
import Slider, { CustomArrowProps } from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const arrowStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  zIndex: 2,
  width: 30,
  height: 30,
  background: "#5bb3d6",
  border: "none",
  borderRadius: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#fff",
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const SLIDES_TO_SHOW = 2;

function NextArrow(props: CustomArrowProps) {
  const { onClick, currentSlide, slideCount } = props;
  if (
    typeof currentSlide === "number" &&
    typeof slideCount === "number" &&
    currentSlide >= slideCount - SLIDES_TO_SHOW
  ) {
    return null;
  }
  return (
    <button
      type="button"
      className="custom-slick-arrow custom-slick-next"
      style={{ ...arrowStyle, right: 0 }}
      onClick={onClick}
      aria-label="Next"
    >
      <span style={{ fontSize: 28 }}>→</span>
    </button>
  );
}

function PrevArrow(props: CustomArrowProps) {
  const { onClick, currentSlide } = props;
  if (typeof currentSlide === "number" && currentSlide === 0) {
    return null;
  }
  return (
    <button
      type="button"
      className="custom-slick-arrow custom-slick-prev"
      style={{ ...arrowStyle, left: 0 }}
      onClick={onClick}
      aria-label="Previous"
    >
      <span style={{ fontSize: 28 }}>←</span>
    </button>
  );
}

const sliderSettings = {
  slidesToShow: SLIDES_TO_SHOW,
  slidesToScroll: 1,
  autoplay: false,
  infinite: false,
  arrows: true,
  dots: true,
  nextArrow: <NextArrow />,
  prevArrow: <PrevArrow />,
  responsive: [
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 1,
      },
    },
  ],
};

export default function CarouselUl({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Slider {...sliderSettings}>{children}</Slider>;
}
