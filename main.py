import os
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from PIL import Image
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip

# Function to add watermark to image
def add_watermark_to_image(image_path, watermark_text):
    # Open the image
    img = Image.open(image_path)
    
    # Add watermark
    # You'll need to implement this part based on your watermarking method
    
    # Save the image with the watermark
    img.save("watermarked_image.png")

# Function to add watermark to video
def add_watermark_to_video(video_path, watermark_text):
    # Open the video
    video_clip = VideoFileClip(video_path)
    
    # Add watermark
    # You'll need to implement this part based on your watermarking method
    
    # Save the video with the watermark
    watermarked_video_path = "watermarked_video.mp4"
    video_clip.write_videofile(watermarked_video_path)
    video_clip.close()

# Command handler for /w
def watermark_command(update: Update, context: CallbackContext):
    # Check if watermark text is provided
    if len(context.args) == 0:
        update.message.reply_text("Please provide a watermark text.")
        return

    watermark_text = ' '.join(context.args)

    # Check if the user sent an image or a video
    if update.message.photo:
        # Get the file ID of the largest image (highest resolution)
        file_id = update.message.photo[-1].file_id
        new_file = context.bot.get_file(file_id)
        new_file.download('image.jpg')
        add_watermark_to_image('image.jpg', watermark_text)
        update.message.reply_photo(open('watermarked_image.png', 'rb'))
    elif update.message.video:
        file_id = update.message.video.file_id
        new_file = context.bot.get_file(file_id)
        new_file.download('video.mp4')
        add_watermark_to_video('video.mp4', watermark_text)
        update.message.reply_video(open('watermarked_video.mp4', 'rb'))
    else:
        update.message.reply_text("Please send an image or a video to watermark.")

def main():
    # Initialize the bot
    updater = Updater("6701652400:AAGj9Pm6dkfhGVQ42CJR-FqAUlFDzyyiAM4", use_context=True)

    # Get the dispatcher to register handlers
    dp = updater.dispatcher

    # Register the /w command handler
    dp.add_handler(CommandHandler("w", watermark_command))

    # Start the Bot
    updater.start_polling()

    # Run the bot until you press Ctrl-C
    updater.idle()

if __name__ == '__main__':
    main()
