import sharp from "sharp";
import cloudinary from "../utlis/cloudinary.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";

export const addNewPost = async (req, res) => {
    try {
        const authorId = req.id;
        const { caption } = req.body;
        const image = req.file;
        if (!image) {
            return res.status(404).json({
                message: "Please upload the image",
                success: false,
            });
        }
        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: "inside" })
            .toFormat("jpeg", { quality: 80 })
            .toBuffer();

        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString("base64")}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri);

        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId,
        });

        await User.updateOne({ _id: authorId }, { $push: { posts: post._id } });
        await post.populate({ path: "author", select: "-password" });

        return res.status(201).json({
            message: "Post added successfully",
            success: true,
        });
    } catch (error) {
        console.log(`Error while adding the new post ${error}`);
    }
};

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate({ path: "author", select: "username profilePicture" })
            .populate({
                path: "comments",
                sort: { createdAt: -1 },
                populate: {
                    path: "author",
                    select: "username profilePicture",
                },
            });
        return res.status(200).json({
            posts,
            success: true,
        });
    } catch (error) {
        console.log(`Error while getting all post: ${error}`);
    }
};

export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .populate({
                path: "author",
                select: "username profilePicture",
            })
            .populate({
                path: "comments",
                sort: { createdAt: -1 },
                populate: {
                    path: "author",
                    select: "username profilePicture",
                },
            });
        return res.status(200).json({
            posts,
            success: true,
        });
    } catch (error) {
        console.log(`Error while getting the user post: ${error}`);
    }
};

export const likePost = async (req, res) => {
    try {
        const userId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: false,
            });
        }
        await post.updateOne({ $addToSet: { likes: userId } });
        await post.save();
        return res.status(200).json({
            message: "Post liked",
            success: true,
        });
    } catch (error) {
        console.log(`Error while liking the post: ${error}`);
    }
};

export const dislikePost = async (req, res) => {
    try {
        const userId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: false,
            });
        }
        await post.updateOne({ $pull: { likes: userId } });
        await post.save();
        return res.status(200).json({
            message: "Post disliked",
            success: true,
        });
    } catch (error) {
        console.log(`Error while liking the post: ${error}`);
    }
};

export const addComment = async (req, res) => {
    try {
        const userId = req.id;
        const postId = req.params.id;
        const { text } = req.body;
        const post = await Post.findById(postId);
        if (!text) {
            return res.status(400).json({
                message: "Text not found",
                success: false,
            });
        }
        if (!post) {
            return res.status(400).json({
                message: "Post not found",
                success: false,
            });
        }
        const comment = await Comment.create({
            text,
            author: userId,
            post: postId,
        });
        await comment.populate({
            path: "author",
            select: "username profilePicture",
        });
        post.comments.push(comment._id);
        await post.save();
        return res.status(201).json({
            message: "Comment has been added successfully",
            success: true,
            comment,
        });
    } catch (error) {
        console.log(`Error while adding the comment: ${error}`);
    }
};

export const getCommentsOfPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const comments = await Comment.find({ post: postId }).populate(
            "author",
            "username profilePicture"
        );
        if (!comments) {
            return res.status(404).json({
                message: "No comments found for this post",
                success: false,
            });
        }
        return res.status(200).json({
            success: true,
            comments,
        });
    } catch (error) {
        console.log(`Error while getting the commments of a post: ${error}`);
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post does not exist",
                success: false,
            });
        }

        if (userId !== post.author.toString()) {
            return res.status(403).json({
                message:
                    "You are not authorized to delete the post of other user",
                success: false,
            });
        }
        await Post.findByIdAndDelete(postId);

        // await User.updateOne({_id:userId}, {$pull:{post:postId}});
        let user = await User.findById(userId);
        user.posts = user.posts.filter((id) => id.toString() !== postId);
        await user.save();

        await Comment.deleteMany({ post: postId });
        return res.status(200).json({
            message: "Post deleted successfully",
            success: true,
        });
    } catch (error) {
        console.log(`Error while deleting the post: ${error}`);
    }
};

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.id;
        const user = await User.findById(userId);
        if (user.bookmarks.includes(postId)) {
            await user.updateOne({ $pull: { bookmarks: postId } });
            await user.save();
            return res.status(200).json({
                type: "unsaved",
                message: "Post removed from Bookmarks",
                success: true,
            });
        } else {
            user.updateOne({ $addToSet: { bookmarks: postId } });
            await user.save();
            return res.status(200).json({
                type: "saved",
                message: "Post added to Bookmarks",
                success: true,
            });
        }
    } catch (error) {
        console.log(`Error while bookmarking the post: ${error}`);
    }
};
