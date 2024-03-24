import os
import random
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from moviepy.editor import VideoFileClip, TextClip

# Telegram bot token
TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"

# Directory for storing videos
VIDEO_DIR = "videos/"

# Create video directory if it doesn't exist
os.makedirs(VIDEO_DIR, exist_ok=True)

# Dictionary to store user watermark preferences
user_watermarks = {}
# Dictionary to store user random placement preference
user_random_placement = {}

# Start command handler
def start(update: Update, context: CallbackContext) -> None:
    update.message.reply_text(
        "Welcome to Video Watermark Bot!\n\n"
        "Send /add to add your custom watermark.\n"
        "Then send a video to add watermark.\n"
        "Use /random on or /random off to toggle random watermark placement."
    )

# Add watermark command handler
def add_watermark(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    user_watermarks[user_id] = "ronok"  # Default watermark text
    update.message.reply_text("Please send the text you want to use as a watermark.")

# Handle text messages to set watermark text
def set_watermark_text(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    user_watermarks[user_id] = update.message.text
    update.message.reply_text(f"Watermark text set to: {user_watermarks[user_id]}")

# Handle video messages
def handle_video(update: Update, context: CallbackContext) -> None:
    # Download video
    video_file = context.bot.get_file(update.message.video.file_id)
    video_path = os.path.join(VIDEO_DIR, f"{update.message.video.file_id}.mp4")
    video_file.download(video_path)

    # Apply watermark
    user_id = update.message.from_user.id
    watermark_text = user_watermarks.get(user_id, "ronok")
    random_placement = user_random_placement.get(user_id, False)

    clip = VideoFileClip(video_path)
    if random_placement:
        watermark_position = (random.uniform(0.05, 0.3), random.uniform(0.7, 0.95))
    else:
        watermark_position = ('left', 'bottom')
        
    txt_clip = TextClip(watermark_text, fontsize=50, color='white').set_position(watermark_position).set_duration(clip.duration)
    watermarked_clip = clip.set_audio(None).set_duration(clip.duration).overlay(txt_clip, end_time=clip.duration)
    watermarked_video_path = os.path.join(VIDEO_DIR, f"{update.message.video.file_id}_watermarked.mp4")
    watermarked_clip.write_videofile(watermarked_video_path, codec="libx264")

    # Upload watermarked video
    context.bot.send_video(chat_id=update.effective_chat.id, video=open(watermarked_video_path, 'rb'))

# Random placement command handler
def toggle_random_placement(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    if len(context.args) == 1 and context.args[0] in ['on', 'off']:
        random_placement = True if context.args[0] == 'on' else False
        user_random_placement[user_id] = random_placement
        update.message.reply_text(f"Random watermark placement {'enabled' if random_placement else 'disabled'}.")
    else:
        update.message.reply_text("Usage: /random on | /random off")

# Error handler
def error(update: Update, context: CallbackContext) -> None:
    """Log Errors caused by Updates."""
    print(f"Update {update} caused error {context.error}")

def main() -> None:
    updater = Updater(TOKEN)

    # Get the dispatcher to register handlers
    dispatcher = updater.dispatcher

    # Add handlers
    dispatcher.add_handler(CommandHandler("start", start))
    dispatcher.add_handler(CommandHandler("add", add_watermark))
    dispatcher.add_handler(CommandHandler("random", toggle_random_placement, pass_args=True))
    dispatcher.add_handler(MessageHandler(Filters.text & ~Filters.command, set_watermark_text))
    dispatcher.add_handler(MessageHandler(Filters.video, handle_video))
    dispatcher.add_error_handler(error)

    # Start the Bot
    updater.start_polling()

    updater.idle()


if __name__ == '__main__':
    main()
