import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const ShippingHandler = () => {
  return (
    <div id="wrapper" className="flex flex-col min-h-screen">
      <Header />
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://itrucksea.com/assets/images/top/0x0.webp"
            className="w-full h-full object-cover"
            alt="Shipping Handler Banner"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 via-navy-800/70 to-navy-700/60"></div>
        <div className="container relative z-10 h-full flex flex-col items-start justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Chành nhận tải
          </h1>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <a href="/" className="text-sm text-sea-200 hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-sm text-sea-300">Chành nhận tải</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            GPS boxes VIỆT NAM
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center mb-8">
            <img
              src="https://itrucksea.com/assets/images/top/0x0.webp"
              alt="Vietnam Map"
              className="rounded-lg shadow-lg max-w-md w-full"
            />
            <img
              src="https://itrucksea.com/assets/images/top/0x0.webp"
              alt="GPS Boxes"
              className="rounded-lg shadow-lg max-w-md w-full"
            />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">
            NHẬN TẢI <br /> iBoat4Share
          </h2>

          {[1, 2, 3, 4].map((section) => (
            <div key={section} className="mb-12">
              <div className="border-t border-sea-300 pt-4 mb-4">
                <h3 className="text-lg font-semibold text-sea-700">
                  Khu vực {section}: Đà Nẵng đến Quy Nhơn
                </h3>
              </div>

              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Số</TableHead>
                      <TableHead>Điểm Đi</TableHead>
                      <TableHead>Điểm Đến</TableHead>
                      <TableHead>Khối Lượng</TableHead>
                      <TableHead>Thời Gian</TableHead>
                      <TableHead>Giá Vận Chuyển</TableHead>
                      <TableHead>Hành Động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2].map((row) => (
                      <TableRow key={row}>
                        <TableCell>
                          NT-{section}0{row}
                        </TableCell>
                        <TableCell>Đà Nẵng</TableCell>
                        <TableCell>Nha Trang</TableCell>
                        <TableCell>2,500 kg</TableCell>
                        <TableCell>05/20/2025</TableCell>
                        <TableCell>12,000,000đ</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button className="bg-sea-500 text-white hover:bg-sea-600">
                              Chi Tiết
                            </Button>
                            <Button className="bg-primary text-white hover:bg-primary/90">
                              Đặt Tải
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShippingHandler;
