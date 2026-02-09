$(document).ready(function(){
    $('.market__box2-slider').each(function(){
        var $slider = $(this);
        var slideCount = $slider.children().length; // Đếm số lượng slide trong từng slider

        // Chỉ khởi tạo nếu có ít nhất 2 slide
        if (slideCount > 1) {
            $slider.slick({
                slidesToShow: 2, // Mặc định hiển thị 2 slide trên PC
                slidesToScroll: 1,
                autoplay: false,
                autoplaySpeed: 2000,       
                variableWidth: false,
                infinite: false,
                arrows: true,
                dots: true,
                responsive: [
                    {
                        breakpoint: 768, // Khi xuống dưới 768px (tablet, mobile)
                        settings: {
                            slidesToShow: 1 // Chỉ hiển thị 1 slide trên mobile
                        }
                    }
                ]
            });
        } else {
            console.log("Slider này không đủ slide để khởi tạo:", $slider);
        }
    });
});
