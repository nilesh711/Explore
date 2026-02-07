import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const { text } = req.body;
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }, 
        });

        if (!text) {
            return res.status(404).json({
                message: "Message not found",
                success: false,
            });
        }
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
            });
        }
        const message = await Message.create({
            senderId,
            receiverId,
            message: text,
        });
        conversation.messages.push(message._id);
        await conversation.save();
        return res.status(201).json({
            success: true,
            message,
        });
    } catch (error) {
        console.log(`Error while sending the message ${error}`);
    }
};

export const getMessages = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            return res.status(200).json({
                messages: [],
                success: true,
            });
        }
        await conversation.populate("messages");
        return res.status(200).json({
            success: true,
            messages: conversation?.messages,
        });
    } catch (error) {
        console.log(`Error while getting the messages: ${error}`);
    }
};
