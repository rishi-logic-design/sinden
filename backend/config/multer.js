const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureUploadDirs = () => {
  const dirs = ["uploads/attachments", "uploads/signatures"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // use 'kind' field to choose folder; default 'File'
    const uploadType = req.body.kind || "File";
    const dir =
      uploadType === "Signature" ? "uploads/signatures" : "uploads/attachments";
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}_${basename}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB and max 5 files
});

module.exports = { upload, ensureUploadDirs };
