import os
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from PIL import Image
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip

# Bot token
TOKEN = "6701652400:AAGj9Pm6dkfhGVQ42CJR-FqAUlFDzyyiAM4"

# Function to add watermark to image
def add_watermark_to_image(image_path, watermark_text):
    # Open the image
    img = Image.open(image_path)
    
    # Add watermark (example: adding text at bottom-right corner)
    watermark = Image.new('RGBA', img.size, (255, 255, 255, 0))
    watermark_draw = ImageDraw.Draw(watermark)
    watermark_draw.text((img.width - 200, img.height - 50), watermark_text, fill=(255, 255, 255, 128))
    watermarked_img = Image.alpha_composite(img.convert('RGBA'), watermark)
    
    # Save the image with the watermark
    watermarked_img.save("watermarked_image.png")

# Function to add watermark to video
def add_watermark_to_video(video_path, watermark_text):
    # Open the video
    video_clip = VideoFileClip(video_path)
    
    # Add watermark (example: adding text at bottom-right corner)
    txt_clip = TextClip(watermark_text, fontsize=70, color='white').set_position('bottom right').set_duration(video_clip.duration)
    watermarked_clip = CompositeVideoClip([video_clip, txt_clip])
    
    # Save the video with the watermark
    watermarked_video_path = "watermarked_video.mp4"
    watermarked_clip.write_videofile(watermarked_video_path, codec='libx264')
    watermarked_clip.close()

# Command handler for /start
def start(update: Update, context: CallbackContext):
    update.message.reply_text("Welcome to the Watermark Bot! Send an image or a video to add a watermark.")

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

# Error handler
def error(update: Update, context: CallbackContext):
    """Log Errors caused by Updates."""
    context.error("Update '%s' caused error '%s'", update, context.error)

def main():
    # Initialize the bot
    updater = Updater(TOKEN, use_context=True)

    # Get the dispatcher to register handlers
    dp = updater.dispatcher

    # Register command handlers
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("w", watermark_command))

    # Log all errors
    dp.add_error_handler(error)

    # Start the Bot
    updater.start_polling()

    # Run the bot until you press Ctrl-C
    updater.idle()

if __name__ == '__main__':
    main()
