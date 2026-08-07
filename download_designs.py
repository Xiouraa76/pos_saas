import urllib.request
import os

os.makedirs('designs', exist_ok=True)

screens = [
    {
        "name": "1_Data_Sync_Portal_Mobile",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLtQRmYGwFVlKjJG-v8B4eG7bQdsJn1SFVYuVH_9WNbofnbVZ4Hfe9WpcDNES7jMF15UN9bRbszzJYLlk4i65es9PGig2ltlXN-fSK8Kt972TfhT7N8DUP6yf2zOmEnh9alUY7VCKVjDGy48AB2WeDmCWqCf54knfrZGidzm3yxsWnkx65H0Ym9Nvw7jhkfgchqMDD7ps_HY2T6EjeeCrefcedSafo28IGR-HV7WXM_DdJ3Oz9vwbwTamMSY",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjgzNjI1ODkwOTI1Yzc5OGZiMTkwZWEyEgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "2_Reports_Export_Mobile",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLvXFpe57pL-EFmVP3gd9ZsKk3TA4tMauvzzktqmzOEsQOkGkLfdC6UJtj2bjTVVv0YfochIRVhcbypUQKJEFhG-KPpdOfvrqeDvvvpyzLlqzWIOcW8HuvE3saHxU1RwJufxqSO41rkfIw05sHqmtfWHi__vBOqOdGCfzqiivel8UgjWYc7DxYguaXO3M6xflDHNhHf1xyUXOrZA9wVdDkdDMcSNsned_dM4DOrZRVLP715UQUmk8A4tV3g",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjc1Y2IyMTIwOTI1ZDFmYzBmMmQwMjQ0EgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "3_User_Management_Mobile",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLtYjKQZg1KeCR6B-pThwrb8zrJhflbD9n4aFGsjFtSJR7zqLm_mJb5WbmFdKfD08b7BntIIUTTmKWISAo_TVl2Je1Q0jz_qMc9xzXf_7kYmGNkNj6JgA71uBKYu70GYrQBpo33ne4lDI0cGvrGEulG9cwV2lWe-I34bmrAVbqNZ9m4v6ukm5QkRqLCkEWXJgosn_wr77p4FdK03W3SsXGa5OVoryOIrELtbnmYdeljOlzddmCB-mM4ASaaK",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjg2N2U2OWUwMjJkNjllMzBkMjMwMjRmEgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "4_Delivery_POS_Mobile",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLtwwKTyedsMujE_61MujNGCQN6f-8CMPwrYM0fxlueCWTYUVzOiY-hBP3ZRUke9ArXSsK6CK7ToZzJMYnZ7Uxmx_sMfhGMobxK7EnpKDR5TqZ4-xNlGoH8tT5_FrBC3P3aLelymMUDvSaOsHgxcIhO_Jj6tHbUYCtuNOVB5G7lmMfi_NYRzHmuzu9QfBvnzaKbo4XmAwhOCYhl2Q0iOjnXvJ-UKyp0LnjMvAD9TvJZYLrsG4qsfTfHePGU",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjg5NzM5ZjIwOTI1ZDQ1MWY0Mjc5NGNjEgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "5_User_Management",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLtmyxpi9s6lLuCDux4OtHHGQkxX2R_UM7TwFPZDJ74D_OqCqEU_Hh3bMIEze_fnZUvqRQ1xavhjHP-D2OWhLXW6ZcVn3CXf_BLH-l-FSPwRB72ZWG2OA7SVCWFrvT9CiTN4JTxt3WR0WcTbO8YiN_dTEkjnK1WHJ7iNkTYMgkpr7E9XIvQ895s7v_b0JqvjwDa2lHk7DupjOpSdkzUrlYyQs3UNX7InX2EO65XWWvBOMOQIvc8IpKvibgYk",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjRjZjUwOWEwMWE2MmYzNzQzMzk0MGU3EgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "6_Analytics_Dashboard_Mobile",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLsq2D349r7ejTVADJ4R1oZ_PTy6LrRhEGrl_bPzGA4eDaBdvzxK6EQx_4DbgD2wGsmrUHQHtNbuLhyrbh6ZM9joJ7mhLwu-2eLaqP6MwuEaAo0yya3JbSx4O4ToHEgr3XbvkZrBm1DkquQxAYKwDWmgLzdcVHrxV8HR4fTMkmCQVvjK5sNnI1icKj_rom7zes1XnqOgS3zdL5243PqgdN--0PMva0EJ_0nlpGczML4jupiASocQcKTGtzbw",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjkwZjljYjEwNzc5YTBlYjU3MjAzYjM5EgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "7_Reports_Export",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLsedLLVNoPvinqnffchptpC0OShIL14lOmWXbpuWn3C8dqRPknyI50egFedspxy1r94SKjB9jIC2F6wBMQTdyC5ABEeo3VQUSFvB8WfQs-n8fVkhjmSnLjM3IxH2cq3ASEAakR92rIifdht--Akkj72Wh8V_NjK2Fl5Btw3RKYD1yTbbBpFPbMO71acd7yLWjmrO-aahxlFgGcMAEdaMZz00ZYchbrULmTe6lqmH4in8o51MWmzNkGqhAdc",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjRjNjU5MzEwMzM4NWVhZGJiMjQ4NjUxEgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "8_Data_Sync_Portal",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLva4oGV57Ao_ZhX14QxOuWTmr6M7WiR_u07UdfKlrQJArSJbHaQgMiQqufBaCkWg_YECgaFUyj_p7LDEoFZ3G18zfVXTLBPV426l2g3hegsZ9LPSMarhzDyZ1qY-5GnWnrF05h4gUbU75txZG3a_9KsWWbI2UPhSMkCCXdCnwbXbk3HoLLdouVoqPPsb-oOZqL5z7GBKYNzTxzxwBYxCGDt-WUxYtD-OQf9h8Jy9xmb0fk4qC_9wm6fnALS",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjRhOGI5NzMwOTI1Yzc5OGZiMTkwZWEyEgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "9_Delivery_Management_POS",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLsWscbNytLbVsvp0-igcCzM1iCXx8siY-8_JIO5axG6NUNwuKy6y--8vUuF0TzRcCiZZb83aRMWsh7SR1Gb7nDEoEz5RBZn5EPcBWbYJaa_PtVeqn9U3WgCUel_OItXmaEqNgKW1FHmATWxiJs9QnDo98EnY2q-7hRkfaNUH3_HWnZJ53Vm7i0N2ysMRAx3sOzo1nomPk7gX7dW0WjBf1GaeuyKX6rmxhlBlsN73PGycOYbTlnXzGbxPuag",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjQ5YTg5OTQwMDMwMzZjNzIwMGEwMWY3EgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    },
    {
        "name": "10_Analytics_Dashboard",
        "image": "https://lh3.googleusercontent.com/aida/AP1WRLvxyX1YuvKxqAqnbMEE1f_VWusnq7bYdJnpsY84dcopc3gDOOZPW5Jz8j0ZJw4KG9qbJTH6iOBTxRY6HLRTJuLPSZrJMA2xnnd0HuggJwCcfvn-RCgTEtlpyJkGrJWdaWo-y6N4GTmVFdDCAL3eCu9yIDZZRyBWNgsalvVEjrSl0hthiijWaDR8-cOcNzL2pnWErxvmZyaqlJYpF12qWPZv2qyxqt5fONqm0o1_TEME6u2XQHgF3s7GPuV9",
        "html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1N2MyNjRiNGQ3N2QwN2M0ZDY0YzM0MzkyZDE4EgsSBxDd_ZeriwoYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjY1MjgxNjkyNTcwMTczMjExMg&filename=&opi=89354086"
    }
]

for screen in screens:
    name = screen['name']
    print(f"Downloading {name}...")
    
    try:
        # Save image (assuming PNG based on typical screenshot formats)
        urllib.request.urlretrieve(screen['image'], f"designs/{name}.png")
        print(f"Saved {name}.png")
        
        # Save HTML
        urllib.request.urlretrieve(screen['html'], f"designs/{name}.html")
        print(f"Saved {name}.html")
    except Exception as e:
        print(f"Failed to download {name}: {e}")

print("All downloads complete.")
