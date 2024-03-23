import requests
import datetime
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, ChatAction
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, MessageHandler, Filters, CallbackContext

BASE_URL = 'https://api.hornyhouse.xyz/tra/'
user_memberships = {}
daily_users = {}

def update_daily_users(user_id):
    today = datetime.date.today().isoformat()
    if today not in daily_users:
        daily_users[today] = set()
    daily_users[today].add(user_id)

def start(update: Update, context: CallbackContext):
    first_name = update.effective_user.first_name
    context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    greeting = f"🎉 Welcome, {first_name}! 🎉\n\nChoose an option to get started 😊"
    keyboard = [
        [InlineKeyboardButton("🛒 Buy Membership", callback_data='buy_membership')],
        [InlineKeyboardButton("🌟 Benefits of Membership", callback_data='benefits')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text(greeting, reply_markup=reply_markup)
    update_daily_users(update.effective_user.id)

def stats(update: Update, context: CallbackContext):
    today = datetime.date.today().isoformat()
    user_count = len(daily_users.get(today, []))
    update.message.reply_text(f"📊 Today's User Count: {user_count}")

def main_menu(update: Update, context: CallbackContext, message_id=None):
    context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    keyboard = [
        [InlineKeyboardButton("🛒 Buy Membership", callback_data='buy_membership')],
        [InlineKeyboardButton("🌟 Benefits of Membership", callback_data='benefits')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    text = "স্বাগতম! একটি অসাধারণ অফারে আপনাকে স্বাগত জানাচ্ছি! \n\n\আমরা আপনাকে ২০+ প্রিমিয়াম দেশি কালেকশন, নিয়মিত আপডেট কনটেন্ট, এবং লাইফটাইম মেম্বারশিপের সুবিধাগুলি সহ অনেক অনেক আরও দিতে সম্পূর্ণ প্রস্তাবনা দেই! প্রিমিয়াম মেম্বারশিপ কেনার জন্য ' \n\n\🛒 প্রিমিয়াম মেম্বারশিপ কিনুন' বাটনে ক্লিক করুন। "
    if message_id:
        context.bot.edit_message_text(text=text, chat_id=update.effective_chat.id, message_id=message_id, reply_markup=reply_markup)
    else:
        update.message.reply_text(text, reply_markup=reply_markup)
    update_daily_users(update.effective_user.id)

def payment_menu(update: Update, context: CallbackContext, query):
    context.bot.send_chat_action(chat_id=query.message.chat_id, action=ChatAction.TYPING)
    keyboard = [
        [InlineKeyboardButton("💸 Bkash", callback_data='bkash')],
        [InlineKeyboardButton("💳 Nagad", callback_data='nagad')],
        [InlineKeyboardButton("🚀 Rocket", callback_data='rocket')],
        [InlineKeyboardButton("🔙 Back", callback_data='back_main')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    query.edit_message_text(text="পেমেন্ট করতে তৈরি? নীচে আপনার পছন্দের পেমেন্ট মেথড নির্বাচন করুন 💰", reply_markup=reply_markup)
    update_daily_users(query.from_user.id)

def verify_transaction(update: Update, context: CallbackContext, back_to_payment=False):
    keyboard = [[InlineKeyboardButton("🔙 Back", callback_data='back_to_payment')]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.callback_query.edit_message_text(text="স্বাগতম! লেনদেন যাচাই করতে, দয়া করে আপনার লেনদেনের ট্রাঞ্জেকশন আইডি এখানে অবশ্যই লিখুন। এইভাবে ✅ প্রতিক্ষণ প্রিমিয়াম সুবিধা পেতে সম্ভব হবে!", reply_markup=reply_markup)

def check_transaction(update: Update, context: CallbackContext):
    chat_id = update.effective_chat.id
    transaction_id = update.message.text
    first_name = update.effective_user.first_name

    if chat_id in user_memberships and user_memberships[chat_id] >= 2:
        context.bot.send_message(chat_id=chat_id, text="❌ আপনি সর্বাধিক মেম্বারশিপ সীমা (2 বার) পৌঁছে গেছেন।")
        return

    response = requests.get(BASE_URL + 'check_transaction_updated.php', params={'transaction_id': transaction_id})
    if response.text == 'used':
        context.bot.send_message(chat_id=chat_id, text="❌ এই লেনদেন আইডি আগেই ব্যবহৃত হয়েছে। আপনি একটি নতুন লেনদেন আইডি ব্যবহার করতে চাইলে, অনুগ্রহ করে নতুন লেনদেন আইডি সাবমিট করুন।")
        return

    response = requests.get('https://api.hornyhouse.xyz/t.txt')
    api_text = response.text

    if transaction_id in api_text:
        payload = {'chat_id': chat_id, 'transaction_id': transaction_id}
        requests.post(BASE_URL + 'save_transaction_updated.php', data=payload)

        message = f"🥳 অভিনন্দন, {first_name}! আপনার পেমেন্ট সাফল্যের সাথে সম্পন্ন হয়েছে! 🎉\n\n"
        message += "🔑 এখানে আপনার প্রিমিয়াম লিংকগুলি পেতে এই লিংকগুলি ক্লিক করুন:\n\n"
        message += "1. লিংক 1: [লিংক 1](https://t.me/+jwVA1088ntI4NTY1)\n"
        message += "2. লিংক 2: [লিংক 2](https://t.me/+HtfDVNyNaPcxNWVl)\n"
        message += "\nআমাদের সেবা ব্যবহার করার জন্য আপনি ধন্যবাদ! 💖"

        if chat_id in user_memberships:
            user_memberships[chat_id] += 1
        else:
            user_memberships[chat_id] = 1

        context.bot.send_message(chat_id=chat_id, text=message, parse_mode="Markdown")
    else:
        context.bot.send_message(chat_id=chat_id, text="❌ আপনার লেনদেন আইডি আমাদের সার্ভারে পাওয়া যায়নি। আবার চেষ্টা করুন, দয়া করে!")
    update_daily_users(update.effective_user.id)

def button(update: Update, context: CallbackContext):
    query = update.callback_query
    query.answer()

    if query.data == 'buy_membership':
        payment_menu(update, context, query)
    elif query.data in ['bkash', 'nagad', 'rocket']:
        context.bot.send_chat_action(chat_id=query.message.chat_id, action=ChatAction.TYPING)
        payment_method = query.data.capitalize()
        response = f" {payment_method} পারসোনাল নাম্বার: 01779335569\n\nটাকা পাঠিয়ে নিচের বাটনে ক্লিক করে ভেরিফাই করুন👇\n\nটাকার পরিমান :১৫০৳"
        keyboard = [[InlineKeyboardButton("✅ Verify Your Transaction", callback_data='verify')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        query.edit_message_text(text=response, reply_markup=reply_markup)

    if query.data == 'benefits':
        context.bot.send_chat_action(chat_id=query.message.chat_id, action=ChatAction.TYPING)
        keyboard = [[InlineKeyboardButton("🔙 Back", callback_data='back_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = "🌟 আমাদের প্রিমিয়াম মেম্বারশিপ নিলে পাবেন নিম্নলিখিত সুবিধাসমূহ 👇\n\n"
        message += "✅ ২০+ প্রিমিয়াম দেশি কালেকশন: সর্বোচ্চ মানের নতুন কন্টেন্ট নিন প্রতিদিন!\n\n"
        message += "✨ রেগুলার আপডেট কনটেন্ট: সবসময় নতুন মেম্বারদের জন্য নতুন আপডেট!\n\n"
        message += "💸 লাইফটাইম মেম্বারশিপ: একবার কিনলে সারাজীবন এই সুবিধাগুলি পেতে থাকবেন!\n\n"
        message += "তাহলে তৈরি হয়ে যান, একটি প্রিমিয়াম মেম্বার হোন এবং আমাদের আরও বেশি অসাধারণ কন্টেন্ট অথবা প্রিমিয়াম সুবিধাগুলি উপভোগ করুন! 😊"
        
        query.edit_message_text(text=message, reply_markup=reply_markup)

    elif query.data == 'back_main':
        main_menu(update, context, message_id=query.message.message_id)
    elif query.data == 'back_to_payment':
        payment_menu(update, context, query)
    elif query.data == 'verify':
        verify_transaction(update, context)
    update_daily_users(query.from_user.id)

def main():
    token = '6701652400:AAGj9Pm6dkfhGVQ42CJR-FqAUlFDzyyiAM4'  # Replace with your actual bot token
    updater = Updater(token, use_context=True)
    dp = updater.dispatcher
    dp.add_handler(CommandHandler('start', start))
    dp.add_handler(CommandHandler('stat', stats))
    dp.add_handler(CallbackQueryHandler(button))
    dp.add_handler(MessageHandler(Filters.text & ~Filters.command, check_transaction))

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
