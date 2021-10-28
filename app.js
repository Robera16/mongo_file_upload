const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const { resolve } = require("path");

// no model, use gridfsStream to do basic crud operation
const app = express();
// Middleware
app.use(bodyParser.json());
app.use(methodOverride("methodOverride"));
app.set("view engine", "ejs");

// Mongo URI
const mongoURI = "mongodb://localhost:27017/fileupload";
// "mongodb+srv://robW123:robW123@cluster0.uwhek.mongodb.net/fileupload?retryWrites=true&w=majority";
//  "mongodb+srv://bradt1234:bradt1234@cluster0.bgtnz.mongodb.net/fileupload?retryWrites=true&w=majority";
// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Init gfs
let gfs;

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });
// @route GET /
// @desc Loads form

app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files exist
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

// @route POST /upload
// @desc Uploads file to DB

app.post("/upload", upload.single("file"), (req, res) => {
  // res.json({ file: req.file });
  res.redirect("/");
});

// @ route GET /files
// @ desc Display all files in JSON

app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }
    // Files exist
    return res.json(files);
  });
});

// @ route GET /files/:filename
// @ desc Display all files in JSON

app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if files
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No files exists",
      });
    }
    // File exists
    return res.json(file);
  });
});

// @ route GET /image/:filename
// @ desc Display single file object

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No files exists",
      });
    }
    // File exists
    // Check if image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // Read output to browser
      var readstream = gfs.createReadStream(file.filename);
      // const readStream = gfs.openDownloadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an image",
      });
    }
  });
});

//@route DELETE /files/:id
//@desc Delete file
app.post("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    res.redirect("/");
  });
});

const port = 3000;

app.listen(port, () => console.log(`server started on port ${port}`));
