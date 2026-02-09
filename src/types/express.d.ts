import "express-serve-static-core";
import { Multer } from "multer";

declare module "express-serve-static-core" {
  interface Request {
    file?: Multer.File;
  }
}
