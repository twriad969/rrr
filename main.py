import os
import random
import threading
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext, CallbackQueryHandler
from telegram.ext import Dispatcher, PicklePersistence
from telegram.ext import MessageQueue
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

# Get the token from environment variable
TOKEN = os.getenv("6701652400:AAFvnBkqFP8WZrPs-hAq73Yd01bIwKjWhcI")

# Directory for storing videos
VIDEO_DIR = "videos/"

# Create video directory if it doesn't exist
os.makedirs(VIDEO_DIR, exist_ok=True)

# Dictionary to store user watermark preferences
user_watermarks = {}

# Dictionary to store user random watermark preference
user_random_watermark = {}

# Dictionary to store progress message ID
progress_message_ids = {}

# Port to listen on (Heroku requirement)
PORT = int(os.environ.get("PORT", 5000))


# Start command handler
def start(update: Update, context: CallbackContext) -> None:
    update.message.reply_text(
        "Welcome to Video Watermark Bot!\n\n"
        "Send /add to add your custom watermark.\n"
        "Then send a video to add watermark.\n"
        "Use /random on to apply random watermark position or /random off for default position."
    )


# Add watermark command handler
def add_watermark(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    user_watermarks[user_id] = "ronok"  # Default watermark text
    user_random_watermark[user_id] = False  # Default random watermark off
    update.message.reply_text("Please send the text you want to use as a watermark.")


# Handle text messages to set watermark text
def set_watermark_text(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    user_watermarks[user_id] = update.message.text
    update.message.reply_text(f"Watermark text set to: {user_watermarks[user_id]}")


# Handle random watermark setting
def set_random_watermark(update: Update, context: CallbackContext) -> None:
    user_id = update.message.from_user.id
    if context.args and context.args[0].lower() == "on":
        user_random_watermark[user_id] = True
        update.message.reply_text("Random watermark position is ON.")
    elif context.args and context.args[0].lower() == "off":
        user_random_watermark[user_id] = False
        update.message.reply_text("Random watermark position is OFF.")
    else:
        update.message.reply_text("Please use /random on or /random off to set random watermark position.")


# Progress thread function
def progress_thread(update: Update, context: CallbackContext, chat_id: int) -> None:
    progress = 0
    while progress < 100:
        context.bot.edit_message_text(chat_id=chat_id, message_id=progress_message_ids[chat_id],
                                      text=f"Processing video... {progress}%")
        progress += 5
        threading.Event().wait(5)  # Wait for 5 seconds
    context.bot.edit_message_text(chat_id=chat_id, message_id=progress_message_ids[chat_id],
                                  text="Video processing complete.")


# Handle video messages
def handle_video(update: Update, context: CallbackContext) -> None:
    # Send progress message
    progress_message = update.message.reply_text("Processing video...")
    progress_message_ids[update.message.chat_id] = progress_message.message_id

    # Start progress thread
    threading.Thread(target=progress_thread, args=(update, context, update.message.chat_id), daemon=True).start()

    # Download video
    video_file = context.bot.get_file(update.message.video.file_id)
    video_path = os.path.join(VIDEO_DIR, f"{update.message.video.file_id}.mp4")
    video_file.download(video_path)

    # Apply watermark
    user_id = update.message.from_user.id
    watermark_text = user_watermarks.get(user_id, "ronok")
    random_watermark = user_random_watermark.get(user_id, False)

    clip = VideoFileClip(video_path)
    txt_clip = TextClip(watermark_text, fontsize=50, color='white').set_position('bottom').set_duration(clip.duration)
    
    if random_watermark:
        # Apply random watermark position
        watermark_x = random.randint(10, clip.size[0] - 200)
        watermark_y = random.randint(10, clip.size[1] - 50)
        txt_clip = txt_clip.set_position((watermark_x, watermark_y))
    
    watermarked_clip = CompositeVideoClip([clip, txt_clip])

    # Save watermarked video
    watermarked_video_path = os.path.join(VIDEO_DIR, f"{update.message.video.file_id}_watermarked.mp4")
    watermarked_clip.write_videofile(watermarked_video_path, codec="libx264", threads=4)

    # Upload watermarked video
    context.bot.send_video(chat_id=update.effective_chat.id, video=open(watermarked_video_path, 'rb'))

    # Delete progress message
    del progress_message_ids[update.message.chat_id]


# Error handler
def error(update: Update, context: CallbackContext) -> None:
    """Log Errors caused by Updates."""
    logger.warning(f"Update {update} caused error {context.error}")


def main() -> None:
    # Create the Updater and pass it your bot's token
    updater = Updater(TOKEN)

    # Get the dispatcher to register handlers
    dispatcher = updater.dispatcher

    # Add handlers
    dispatcher.add_handler(CommandHandler("start", start))
    dispatcher.add_handler(CommandHandler("add", add_watermark))
    dispatcher.add_handler(CommandHandler("random", set_random_watermark))
    dispatcher.add_handler(MessageHandler(Filters.text & ~Filters.command, set_watermark_text))
    dispatcher.add_handler(MessageHandler(Filters.video, handle_video))
    dispatcher.add_error_handler(error)

    # Start the Bot
    updater.start_webhook(listen="0.0.0.0",
                          port=PORT,
                          url_path=TOKEN)
    updater.bot.set_webhook("https://watermarkok-1be00fecb5fb.herokuapp.com/" + TOKEN)

    # Run the bot until you press Ctrl-C
    updater.idle()


if __name__ == '__main__':
    main()
