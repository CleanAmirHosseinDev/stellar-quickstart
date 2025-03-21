import json
import matplotlib.pyplot as plt

def analyze_payments():
    try:
        # تلاش برای باز کردن و بارگذاری داده‌ها از فایل JSON
        with open("../data/payments.json", "r") as f:
            data = json.load(f)
        
        # بررسی اینکه داده‌ها شامل تراکنش‌ها و موجودی‌ها باشند
        if "transactions" not in data or "balances" not in data:
            print("داده‌ها حاوی اطلاعات تراکنش‌ها یا موجودی‌ها نمی‌باشند.")
            return

        # محاسبه مجموع COIN ارسال شده
        total_sent = sum(float(t["amount"]) for t in data["transactions"] if "amount" in t)
        print(f"Total COIN Sent: {total_sent}")

        # ساخت دیکشنری برای موجودی‌های حساب‌ها
        balances = {b["publicKey"][:6]: float(b["balance"]) for b in data["balances"] if "publicKey" in b and "balance" in b}
        
        # رسم نمودار برای موجودی‌های حساب‌ها
        if balances:
            plt.bar(balances.keys(), balances.values())
            plt.title("Account Balances")
            plt.xlabel("Account (Shortened Public Key)")
            plt.ylabel("COIN")
            plt.show()
        else:
            print("هیچ موجودی حسابی برای نمایش یافت نشد.")
    
    except FileNotFoundError:
        print("فایل payments.json یافت نشد.")
    except json.JSONDecodeError:
        print("خطا در تجزیه فایل JSON. لطفاً بررسی کنید که فایل به درستی فرمت شده باشد.")
    except Exception as e:
        print(f"خطای غیرمنتظره‌ای رخ داده است: {e}")

if __name__ == "__main__":
    analyze_payments()
