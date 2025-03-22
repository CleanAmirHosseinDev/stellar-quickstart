import json
import matplotlib.pyplot as plt
from stellar_sdk import Server, Keypair, TransactionBuilder, Network, Asset

# تنظیمات شبکه استلار
HORIZON_URL = "https://horizon-testnet.stellar.org"
NETWORK_PASSPHRASE = Network.TESTNET_NETWORK_PASSPHRASE

# تابع برای ایجاد یک دارایی جدید (توکن‌سازی)
def create_asset(issuer_secret, asset_code, amount):
    try:
        issuer_keypair = Keypair.from_secret(issuer_secret)
        server = Server(horizon_url=HORIZON_URL)
        issuer_account = server.load_account(issuer_keypair.public_key)

        # ایجاد دارایی جدید
        asset = Asset(asset_code, issuer_keypair.public_key)

        # ایجاد تراکنش برای صدور دارایی
        transaction = (
            TransactionBuilder(
                source_account=issuer_account,
                network_passphrase=NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_payment_op(
                destination=issuer_keypair.public_key,  # واریز به حساب خود صادرکننده
                asset=asset,
                amount=amount,
            )
            .set_timeout(30)
            .build()
        )

        transaction.sign(issuer_keypair)
        response = server.submit_transaction(transaction)
        print(f"Asset {asset_code} created successfully. Transaction Hash: {response['hash']}")
        return response
    except Exception as e:
        print(f"Error creating asset: {e}")
        return None

# تابع برای واریز توکن‌ها به یک حساب
def deposit_asset(issuer_secret, destination_public_key, asset_code, amount):
    try:
        issuer_keypair = Keypair.from_secret(issuer_secret)
        server = Server(horizon_url=HORIZON_URL)
        issuer_account = server.load_account(issuer_keypair.public_key)

        # ایجاد دارایی
        asset = Asset(asset_code, issuer_keypair.public_key)

        # ایجاد تراکنش واریز
        transaction = (
            TransactionBuilder(
                source_account=issuer_account,
                network_passphrase=NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_payment_op(
                destination=destination_public_key,
                asset=asset,
                amount=amount,
            )
            .set_timeout(30)
            .build()
        )

        transaction.sign(issuer_keypair)
        response = server.submit_transaction(transaction)
        print(f"Deposit successful. Transaction Hash: {response['hash']}")
        return response
    except Exception as e:
        print(f"Error depositing asset: {e}")
        return None

# تابع برای برداشت توکن‌ها از یک حساب
def withdraw_asset(source_secret, issuer_public_key, asset_code, amount):
    try:
        source_keypair = Keypair.from_secret(source_secret)
        server = Server(horizon_url=HORIZON_URL)
        source_account = server.load_account(source_keypair.public_key)

        # ایجاد دارایی
        asset = Asset(asset_code, issuer_public_key)

        # ایجاد تراکنش برداشت
        transaction = (
            TransactionBuilder(
                source_account=source_account,
                network_passphrase=NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_payment_op(
                destination=issuer_public_key,  # واریز به حساب صادرکننده
                asset=asset,
                amount=amount,
            )
            .set_timeout(30)
            .build()
        )

        transaction.sign(source_keypair)
        response = server.submit_transaction(transaction)
        print(f"Withdrawal successful. Transaction Hash: {response['hash']}")
        return response
    except Exception as e:
        print(f"Error withdrawing asset: {e}")
        return None

# تابع برای تحلیل تراکنش‌ها و موجودی‌ها
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

# تابع اصلی برای تست عملیات
if __name__ == "__main__":
    # مثال برای توکن‌سازی
    issuer_secret = "YOUR_ISSUER_SECRET_KEY"
    asset_code = "MYTOKEN"
    amount = "1000"
    create_asset(issuer_secret, asset_code, amount)

    # مثال برای واریز
    destination_public_key = "DESTINATION_PUBLIC_KEY"
    deposit_asset(issuer_secret, destination_public_key, asset_code, "100")

    # مثال برای برداشت
    source_secret = "SOURCE_SECRET_KEY"
    issuer_public_key = "ISSUER_PUBLIC_KEY"
    withdraw_asset(source_secret, issuer_public_key, asset_code, "50")

    # تحلیل تراکنش‌ها و موجودی‌ها
    analyze_payments()