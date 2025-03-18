import json
import matplotlib.pyplot as plt

def analyze_payments():
    with open("../data/payments.json", "r") as f:
        data = json.load(f)

    total_sent = sum(float(t["amount"]) for t in data["transactions"])
    print(f"Total COIN Sent: {total_sent}")

    balances = {b["publicKey"][:6]: float(b["balance"]) for b in data["balances"]}
    plt.bar(balances.keys(), balances.values())
    plt.title("Account Balances")
    plt.xlabel("Account (Shortened Public Key)")
    plt.ylabel("COIN")
    plt.show()

if __name__ == "__main__":
    analyze_payments()