import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: {type:String, unique:true, required:true}, 
    email: {type:email, unique:true, required:true},
    password: {type:String, required:true},
    profilePicture: {type:String, default:""},
    bio: {type:String, default:""},
    gender: {type:String, enum:['male','female']},
    follower: [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    following: [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    posts: [{type:mongoose.Schema.Types.ObjectId, ref:'Post'}],
    bookmarks: [{type:mongoose.Schema.Types.ObjectId, ref:'Post'}]
},{timestamps:true});

export default User = mongoose.model('User', userSchema);