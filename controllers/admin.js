import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { rm } from "fs";
import { promisify } from "util";
import fs from "fs";
import { User } from "../models/User.js";
import path from "path";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

// Helper function to safely delete file
const safeDeleteFile = async (filePath) => {
  try {
    const exists = await existsAsync(filePath);
    if (exists) {
      await unlinkAsync(filePath);
      console.log("File deleted:", filePath);
    } else {
      console.log("File does not exist:", filePath);
    }
  } catch (error) {
    console.log("Error handling file:", filePath, error.message);
  }
};

export const createCourse = TryCatch(async (req, res) => {
  const { title, description, createdBy, duration, price, category } = req.body;

  const image = req.file;

  await Courses.create({
    title,
    description,
    createdBy,
    image: image?.path,
    duration,
    price,
    category,
  });

  res.status(201).json({
    message: "Course Created Successfully",
  });
});

export const addLectures = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course)
    return res.status(404).json({
      message: "No Course with this id",
    });

  const { title, description } = req.body;

  const file = req.file;

  const lecture = await Lecture.create({
    title,
    description,
    video: file?.path,
    course: course._id,
  });

  res.status(201).json({
    message: "Lecture Added",
    lecture,
  });
});

export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  await safeDeleteFile(lecture.video);
  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted Successfully" });
});

export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const lectures = await Lecture.find({ course: course._id });

  // Delete lecture videos
  await Promise.all(
    lectures.map(async (lecture) => {
      await safeDeleteFile(lecture.video);
    })
  );

  // Delete course image
  await safeDeleteFile(course.image);

  // Delete lectures from database
  await Lecture.deleteMany({ course: req.params.id });

  // Delete course from database
  await course.deleteOne();

  // Remove course from user subscriptions
  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({
    message: "Course Deleted Successfully",
  });
});

export const getAllStats = TryCatch(async (req, res) => {
  const totalCoures = (await Courses.find()).length;
  const totalLectures = (await Lecture.find()).length;
  const totalUsers = (await User.find()).length;

  const stats = {
    totalCoures,
    totalLectures,
    totalUsers,
  };

  res.json({
    stats,
  });
});

export const getAllUser = TryCatch(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select(
    "-password"
  );

  res.json({ users });
});

export const updateRole = TryCatch(async (req, res) => {
  if (req.user.mainrole !== "superadmin")
    return res.status(403).json({
      message: "This endpoint is assign to superadmin",
    });
  const user = await User.findById(req.params.id);

  if (user.role === "user") {
    user.role = "admin";
    await user.save();

    return res.status(200).json({
      message: "Role updated to admin",
    });
  }

  if (user.role === "admin") {
    user.role = "user";
    await user.save();

    return res.status(200).json({
      message: "Role updated",
    });
  }
});
