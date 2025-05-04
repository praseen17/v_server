import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      console.log("No token provided");
      return res.status(403).json({
        message: "Please Login",
      });
    }

    const decodedData = jwt.verify(token, process.env.Jwt_Sec);
    console.log("Token verified successfully");

    const user = await User.findById(decodedData._id);
    
    if (!user) {
      console.log("User not found for token");
      return res.status(403).json({
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      message: "Authentication failed",
      error: error.message
    });
  }
};

export const isAdmin = (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      console.log("User is not admin");
      return res.status(403).json({
        message: "You are not admin",
      });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({
      message: "Admin verification failed",
      error: error.message
    });
  }
};
