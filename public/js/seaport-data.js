// Seaport data for Vietnam ports
const seaportData = [
  { id: 1, name: "Cảng cá Bãi Phúc", city: "Phú Yên", class: 3, address: "Xóm Bãi, làng Đầu, Phú Yên" },
  { id: 2, name: "Cảng cá Phú Lạc", city: "Phú Yên", class: 3, address: "Thôn Hội Sơn, Đông Hòa, Phú Yên" },
  { id: 3, name: "Cảng cá Lộc An", city: "Bà Rịa Vũng Tàu", class: 3, address: "Ấp Hải Lộc, An, Đất Đỏ, BR Vũng Tàu" },
  { id: 4, name: "Cảng cá Cát Lở", city: "Bà Rịa Vũng Tàu", class: 1, address: "1027/24 đường 30/4, Phường 11, BR Vũng Tàu" },
  { id: 5, name: "Cảng cá Phước Hải", city: "Bà Rịa Vũng Tàu", class: 3, address: "Phước Hải, Phước Tỉnh, Long Điền, BR Vũng Tàu" },
  { id: 6, name: "Cảng cá Tân Phước", city: "Bà Rịa Vũng Tàu", class: 3, address: "12 Tân Lập, Phước TPA, Phước Điền, BR Vũng Tàu" },
  { id: 7, name: "Cảng cá Bến Đá", city: "Bà Rịa Vũng Tàu", class: 3, address: "65 Trần Hưng Đạo, TP Vũng Tàu" },
  { id: 8, name: "Cảng cá Kochimex", city: "Bà Rịa Vũng Tàu", class: 3, address: "65.355 Trần Phú, TP Vũng Tàu" },
  { id: 9, name: "Cảng cá Bà Tri/Phú Hải Mỹ Nhựt Thạnh", city: "Bà Rịa Vũng Tàu", class: 3, address: "65.355 Trần Phú, TP Vũng Tàu" },
  { id: 10, name: "Lạch Hà", city: "Quảng Trị", class: 1, address: "Quảng Trị, Cửa Tùng, Thanh Hóa" },
  { id: 11, name: "Lạch Sông", city: "Thanh Hóa", class: 1, address: "Hải Thanh, Tĩnh Gia, Thanh Hóa" },
  { id: 12, name: "Hòa Lộc", city: "Thanh Hóa", class: 3, address: "Hòa Lộc, Hậu Lộc, Thanh Hóa" },
  { id: 13, name: "Cửa Hội", city: "Nghệ An", class: 1, address: "Nghi Hải, Cửa Lò, Nghệ An" },
  { id: 14, name: "Lạch Vạn", city: "Nghệ An", class: 3, address: "Diễn Hùng, Diễn Châu, Nghệ An" },
  { id: 15, name: "Lạch Quèn", city: "Nghệ An", class: 1, address: "Quỳnh Thuận, Quỳnh Lưu, Nghệ An" },
  { id: 16, name: "Sông Gianh", city: "Quảng Bình", class: 1, address: "Thanh Trạch, Bố Trạch, Quảng Bình" },
  { id: 17, name: "Nhật Lệ", city: "Quảng Bình", class: 3, address: "Phú Hải, Đồng Hới, Quảng Bình" },
  { id: 18, name: "Thọ Quang", city: "Đà Nẵng", class: 1, address: "36-50 Vạn Đồn, Thọ Quang, Sơn Trà, Đà Nẵng" },
  { id: 19, name: "Sa Kỳ (Tịnh Kỳ)", city: "Quảng Ngãi", class: 3, address: "Tịnh Kỳ, TP Quảng Ngãi" },
  { id: 20, name: "Mỹ Á", city: "Quảng Ngãi", class: 3, address: "Phổ Quang, Đức Phổ, Quảng Ngãi" },
  { id: 21, name: "Sa Huỳnh", city: "Quảng Ngãi", class: 3, address: "Phổ Thạnh, Đức Phổ, Quảng Ngãi" },
  { id: 22, name: "Quy Nhơn", city: "Bình Định", class: 1, address: "02 Đỗ Đăng Đệ, Hải Cảng, Quy Nhơn, Bình Định" },
  { id: 23, name: "Đề Gi", city: "Bình Định", class: 3, address: "An Quang, Cát Khánh, Phù Cát, Bình Định" },
  { id: 24, name: "Tam Quan", city: "Bình Định", class: 3, address: "Tam Quan Bắc, Hoài Nhơn, Bình Định" },
  { id: 25, name: "Đông Tác", city: "Phú Yên", class: 1, address: "Đông Tác, Tuy Hòa, Phú Yên" },
  { id: 26, name: "Hòn Chùa", city: "Phú Yên", class: 3, address: "An Ninh Tây, Tuy An, Phú Yên" },
  { id: 27, name: "Hòn Rỏi", city: "Phú Yên", class: 1, address: "01/01 Nguyễn Ái Quốc, Đông Hòa Trung, Đông Hòa" },
  { id: 28, name: "Vĩnh Lương", city: "Khánh Hòa", class: 3, address: "Lương Sơn, Vĩnh Trung, Khánh Hòa" },
  { id: 29, name: "Đá Bạc - Cam Ranh", city: "Khánh Hòa", class: 1, address: "Đường Nguyễn Trãi, Tổ Hòn Rớ, Cam Linh, Cam Ranh, Khánh Hòa" },
  { id: 30, name: "Bãi Tiên", city: "Khánh Hòa", class: 3, address: "Đông Bắc, Đại Lãnh, Vạn Ninh, Khánh Hòa" },
  { id: 31, name: "Đông Hải", city: "Ninh Thuận", class: 3, address: "KP 5, Đông Hải, Phan Rang - Tháp Chàm, Ninh Thuận" },
  { id: 32, name: "Ninh Chữ", city: "Ninh Thuận", class: 3, address: "TT Ninh Hải, Ninh Thuận" },
  { id: 33, name: "Cà Ná", city: "Ninh Thuận", class: 1, address: "Cà Ná, Thuận Nam, Ninh Thuận" },
  { id: 34, name: "Phan Thiết", city: "Bình Thuận", class: 1, address: "Phường Phú Thủy, Phan Thiết, Bình Thuận" },
  { id: 35, name: "La Gi", city: "Bình Thuận", class: 3, address: "Phường Phước Lộc, La Gi, Bình Thuận" },
  { id: 36, name: "Phan Rí Cửa", city: "Bình Thuận", class: 3, address: "TT Phan Rí Cửa, Tuy Phong, Bình Thuận" },
  { id: 37, name: "Mỹ Tho", city: "Tiền Giang", class: 3, address: "KP 5, Đốc Lập, Phường 5, Mỹ Tho, Tiền Giang" },
  { id: 38, name: "Vàm Láng", city: "Tiền Giang", class: 1, address: "Phường Chữ 2, TT Vàm Láng, Gò Công Đông, Tiền Giang" },
  { id: 39, name: "Cái Côn", city: "Bến Tre", class: 3, address: "Ấp 8, Bình Đại, Bến Tre" }
];

// Function to populate select element with seaport options
function populateSeaportSelect(selectElementId) {
  const selectElement = document.getElementById(selectElementId);
  if (!selectElement) return;
  
  // Clear existing options
  selectElement.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '- Chọn cảng (1,47) -';
  selectElement.appendChild(defaultOption);
  
  // Add seaport options
  seaportData.forEach(port => {
    const option = document.createElement('option');
    option.value = port.id;
    option.textContent = `${port.name} - ${port.city}`;
    selectElement.appendChild(option);
  });
}

// Export functions for use in other files
window.seaportUtils = {
  populateSeaportSelect,
  getSeaportData: () => seaportData
};