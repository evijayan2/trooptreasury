# Troop Treasury User Guide

Welcome to **Troop Treasury**, the all-in-one platform for managing our troop's events, finances, and scout accounts. This guide will help you understand how the system works, whether you are a Parent, Leader, or Administrator.

---

## 📚 Table of Contents
1. [Core Concepts](#core-concepts)
2. [For Parents & Scouts](#for-parents--scouts)
   - [Managing Your Profile](#managing-your-profile)
   - [Campouts: Signing Up & Paying](#campouts-signing-up--paying)
   - [Understanding IBA (Scout Accounts)](#understanding-iba-scout-accounts)
3. [For Leaders & Admins](#for-leaders--admins)
   - [Managing Campouts](#managing-campouts)
   - [Fundraising Campaigns](#fundraising-campaigns)
   - [Financial Reporting](#financial-reporting)
4. [Fund Calculation Logic](#fund-calculation-logic)

---

## Core Concepts

### 👤 Roles
*   **SCOUT/PARENT**: Participate in events, pay dues, earn funds through campaigns.
*   **LEADER**: Organize campouts, manage rosters, and oversee event logistics.
*   **FINANCIER**: Manage the troop's money, budgets, and approve transactions.
*   **ADMIN**: Full access to all settings and users.

### 💰 IBA (Individual Beneficiary Account)
Think of the **IBA** as a "Scout Wallet" held by the troop.
*   **Money In**: When a scout sells popcorn or wreaths, a percentage of that sale goes into their IBA. Parents can also deposit cash into this account.
*   **Money Out**: This balance can be used to pay for campouts, annual dues, or other troop-related expenses.

---

## For Parents & Scouts

### Managing Your Profile
When you first log in, you will see your Dashboard. This gives you a quick overview of your linked scouts and any outstanding tasks.

*   **Linking Scouts**: If you don't see your scout, ask an Admin to link your account to your scout's profile.
*   **Troop Balance**: This is the total money the troop has *available* (excluding money already allocated to other scouts).

### Campouts: Signing Up & Paying
The Campout workflow is designed to be fair and transparent.

1.  **Registration**: When a campout status is **OPEN**, you can find it on your dashboard and click "Register" for your scout (and yourself, if you are attending).
2.  **The "Ready for Payment" Phase**:
    *   Initially, the exact cost might be an estimate.
    *   Once the campout is over and all expenses (food, site fees, gas) are recorded by the leaders, the status changes to **READY FOR PAYMENT**.
    *   The system calculates the final **Cost Per Person** based on the total expenses divided by the number of participants.
3.  **Making a Payment**:
    *   Navigate to the Campout page.
    *   **Pay with IBA**: If your scout has enough money in their Personal Account (IBA), you will see a button to **"Pay with IBA"**. This instantly transfers funds from their IBA to the campout fund.
    *   **Pay Cash**: If you don't have enough IBA funds, you will see a "Please pay cash" message. You must hand cash/check to the Treasurer, who will then mark you as PAID in the system.

> **Screenshot Placeholder**: *[Image of the Campout Dashboard showing a "Pay with IBA" button next to a scout's name]*

### Understanding IBA (Scout Accounts)
Your scout's **IBA Balance** is critical. You can view this on the main Dashboard or under the "Scouts" tab.

*   **How to grow your IBA**: Participate in fundraising!
*   **Safety**: This money is held safely by the troop but belongs to the scout's "account" for troop use.

---

## For Leaders & Admins

### Managing Campouts
Campout management is the heart of the system.

1.  **Create**: Go to "Campouts" -> "New". Enter the location and dates.
2.  **Manage Roster**: You can manually add/remove scouts and adult leaders.
3.  **Track Expenses**:
    *   During the trip, log expenses (e.g., "$250 for Food at Kroger").
    *   Assign expenses to the specific adult who paid so they can be reimbursed.
4.  **Finalizing**:
    *   Once the trip is done, verify all expenses are entered.
    *   Move the status to **READY FOR PAYMENT**.
    *   The system automatically locks the cost and notifies parents (via the dashboard) of what they owe.
5.  **Closing**: Once everyone has paid, move the status to **CLOSED** to lock the records.

### Fundraising Campaigns
You can create campaigns to help the troop and scouts earn money. There are two types of campaigns:

#### 1. General / Donation (Percentage Based)
Best for simple fundraisers like "Car Wash" or "Wreath Sales" where the profit is a straight percentage of the revenue.
*   **How it works**: You set a "Scout Allocation %" (e.g., 30%).
*   **Payout**: When a transaction is recorded, the system **immediately** credits 30% of that amount to the Scout's IBA.

#### 2. Product Sale (Item Based)
Best for selling physical items with fixed costs, like Popcorn or Candy Bars.
*   **How it works**: You define a product (e.g., "Popcorn Box") with a **Price** (what user pays) and **Scout Profit** (amount to IBA).
*   **Tracking**: Scouts track "Sales" (quantity of items sold).
*   **Payout**: Unlike General campaigns, **no funds are added to the IBA during the campaign**.
    *   Funds are distributed **ONLY when the mechanism is CLOSED**.
    *   When an Admin clicks "Close Campaign", the system calculates the total sales for each scout and generates a bulk transaction to credit their IBAs.
    *   *Warning*: Do not close the campaign until all sales are final!

> **Screenshot Placeholder**: *[Image showing the Campaign Type selection toggle]*

> **Screenshot Placeholder**: *[Image of the "New Fundraising Campaign" form highlighting the "IBA Percentage" field]*

### Financial Reporting
The Finance Dashboard gives you high-level insights.

*   **Transactions**: View every penny in and out.
*   **Reimbursements**: Quickly see which adults are owed money for campout expenses and mark them as paid.
*   **Budgets**: Create annual budgets (Income vs Expense categories/goals) to track how the troop is performing against its plan.

---

## Fund Calculation Logic (How it works under the hood)

For those interested in the numbers, here is exactly how Troop Treasury calculates balances:

### 1. The Cost of a Campout
$$ \text{Total Cost} = \text{Direct Expenses} + \text{Reimbursable Adult Expenses} $$
$$ \text{Cost Per Person} = \frac{\text{Total Cost}}{\text{Count of Scouts} + \text{Count of Paying Adults}} $$

*   *Note*: Organizers are free unless they also mark themselves as an "Attendee" (Participant).

### 2. Fundraising Splits
When a $100 sale is recorded for a scout on a campaign with 30% split:
1.  **Troop Bank**: +$100 (Real Cash)
2.  **Scout IBA**: +$30 (Virtual allocation)
3.  **Troop General Fund**: Effectively +$70.

### 3. Paying with IBA
When a parent clicks "Pay with IBA" for a $50 campout fee:
1.  **Scout IBA**: -$50
2.  **Campout Revenue**: +$50
3.  **Effect**: The money moves from the scout's personal allocation back to the general troop find to cover the credit card bill for the food/site.

---

## ❓ FAQ

**Q: Can I pay for my own adult fees with my scout's IBA?**
A: Yes! If you are attending a campout, the system allows you to use your linked scout's funds to cover your "Adult Attendee" fee, provided there is enough balance.

**Q: I paid cash but it still says "Unpaid".**
A: Cash payments require manual verification. Please allow a few days for the Treasurer to log your payment in the system.

**Q: What happens if I overpay?**
A: The system prevents overpayment on specific line items, but if a correction is made (e.g., campout cost drops), the difference can be credited back to your IBA by an Admin.

**Q: Why hasn't my scout's balance gone up after selling Popcorn?**
A: If it is a **Product Sale** campaign, the funds are not credited until the campaign is officially **CLOSED** by the Treasurer. This ensures all inventory is accounted for before payouts occur.
