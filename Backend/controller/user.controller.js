import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utlis/datauri.js";
import cloudinary from "../utlis/cloudinary.js";
import { Post } from "../models/post.model.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Something is missing. Please check",
                success: false,
            });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({
                message: "Try different email",
                success: false,
            });
        }
        const userCheck = await User.findOne({ username });
        if (userCheck) {
            return res.status(409).json({
                message: "Try different username",
                success: false,
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword,
        });
        return res.status(201).json({
            message: "Account created successfully!",
            success: true,
        });
    } catch (error) {
        console.log(error);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.staus(401).json({
                message: "Something is missing. Please check!",
                success: false,
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        let isPassword = await bcrypt.compare(password, user.password);
        if (!isPassword) {
            return res.status(401).json({
                message: "Incorrect password",
                success: false,
            });
        }
        
        const token = await jwt.sign(
            { userId: user._id },
            process.env.SECRET_KEY,
            { expiresIn: "1d" }
        );

        const populatedPost = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPost,
        };

        return res
            .cookie("token", token, {
                httpOnly: true,
                sameSite: "strict",
                maxAge: 1 * 24 * 60 * 60 * 1000,
            })
            .json({
                message: `Welcome back ${user.username}`,
                success: true,
                user,
            });
    } catch (error) {
        console.log(error);
    }
};

export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            messgae: "Logged out successfully",
            success: true,
        });
    } catch (error) {
        console.log(error);
    }
};

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).select("-password");
        return res.status(200).json({
            user,
            success: true,
        });
    } catch (error) {
        console.log(error);
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;
        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;
        await user.save();
        await res.status(200).json({
            message: "Profile Updated",
            success: true,
            user,
        });
    } catch (error) {
        console.log(error);
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select(
            "-password"
        );
        if (!suggestedUsers) {
            return res.status(400).json({
                message: "Currently don't have any user",
                success: false,
            });
        }
        return res.status(200).json({
            success: true,
            users: suggestedUsers,
        });
    } catch (error) {
        console.log(error);
    }
};

export const followOrUnfollow = async (req, res) => {
    try {
        const userId = req.id;
        const targetUserId = req.params.id;
        if (userId === targetUserId) {
            return res.status(400).json({
                message: "You can not follow/unfollow yourself",
                success: false,
            });
        }
        const user = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);
        if (!user || !targetUser) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }
        const isFollowing = user.following.includes(targetUserId);
        if (isFollowing) {
            await Promise.all([
                User.updateOne(
                    { _id: userId },
                    { $pull: { following: targetUserId } }
                ),
                User.updateOne(
                    { _id: targetUserId },
                    { $pull: { follower: userId } }
                ),
            ]);
            return res.status(200).json({
                messgae: "Unfollowed Successfully!",
                success: false,
            });
        } else {
            await Promise.all([
                User.updateOne(
                    { _id: userId },
                    { $push: { following: targetUserId } }
                ),
                User.updateOne(
                    { _id: targetUserId },
                    { $push: { follower: userId } }
                ),
            ]);
            return res.status(200).json({
                messgae: "Followed Successfully!",
                success: false,
            });
        }
    } catch (error) {
        console.log(error);
    }
};
