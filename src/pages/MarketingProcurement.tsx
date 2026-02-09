import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const MarketingProcurement = () => {
  return (
    <div id="wrapper" className="flex flex-col min-h-screen">
      <Header />
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://itrucksea.com/assets/images/top/0x0.webp"
            className="w-full h-full object-cover"
            alt="Marketing Procurement Banner"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 via-navy-800/70 to-navy-700/60"></div>
        <div className="container relative z-10 h-full flex flex-col items-start justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Tiếp thị thu mua trên biển
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
                  <span className="text-sm text-sea-300">
                    Tiếp thị thu mua trên biển
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">THU MUA</h2>

          {[1, 2, 3, 4].map((section) => (
            <div key={section} className="mb-12">
              <div className="border-t border-sea-300 pt-4 mb-4">
                <h3 className="text-lg font-semibold text-sea-700">
                  Công ty {section}: Chuyên thu mua hải sản
                </h3>
              </div>

              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Số</TableHead>
                      <TableHead>Loại Cá</TableHead>
                      <TableHead>Số Lượng Cần</TableHead>
                      <TableHead>Đơn Vị</TableHead>
                      <TableHead>Đơn Giá Đề Nghị</TableHead>
                      <TableHead>Hành Động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2].map((row) => (
                      <TableRow key={row}>
                        <TableCell>
                          TM-{section}0{row}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <div className="w-12 h-12">
                            <img
                              src={
                                row % 2 === 0
                                  ? "https://itrucksea.com/assets/images/top/0x0.webp"
                                  : "https://itrucksea.com/assets/images/top/0x0.webp"
                              }
                              alt="Fish Type"
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                          <span>Cá ngừ đại dương</span>
                        </TableCell>
                        <TableCell>1,000</TableCell>
                        <TableCell>kg</TableCell>
                        <TableCell>150,000đ</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button className="bg-sea-500 text-white hover:bg-sea-600">
                              Chi Tiết
                            </Button>
                            <Button className="bg-primary text-white hover:bg-primary/90">
                              Liên Hệ
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

export default MarketingProcurement;
