import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "sw";

const LANGUAGE_KEY = "@ekyan/mobile-language";

const SWAHILI: Record<string, string> = {
  "Home": "Nyumbani",
  "Today": "Leo",
  "Field log": "Daftari la shambani",
  "Business book": "Daftari la biashara",
  "Record": "Rekodi",
  "Record a need": "Rekodi hitaji",
  "Add farmer": "Ongeza mkulima",
  "Synthetic farmer name": "Jina la mkulima wa mfano",
  "Synthetic village": "Kijiji cha mfano",
  "Example: Synthetic farmer 003": "Mfano: Synthetic farmer 003",
  "Example: Synthetic village 003": "Mfano: Synthetic village 003",
  "Farmer name and village must begin with Synthetic or Demo.": "Jina la mkulima na kijiji lazima vianze na Synthetic au Demo.",
  "Follow up": "Fuatilia",
  "Input request": "Ombi la pembejeo",
  "Keep farmer requests moving.": "Fuatilia maombi ya wakulima.",
  "See what needs attention, record a request, and follow it through—even offline.": "Ona kinachohitaji hatua, rekodi ombi na lifuatilie—hata bila mtandao.",
  "Capture a farmer need, input request or practice intention": "Rekodi hitaji la mkulima, ombi la pembejeo au nia ya kutumia mbinu",
  "Choose a record type": "Chagua aina ya rekodi",
  "Synthetic farmer references could not be cached.": "Vitambulisho vya wakulima wa mfano havikuweza kuhifadhiwa.",
  "Farmer records could not be loaded.": "Rekodi za wakulima hazikuweza kupakiwa.",
  "Saved synthetic farmer references could not be read.": "Vitambulisho vilivyohifadhiwa vya wakulima wa mfano havikuweza kusomwa.",
  "Pilot activity": "Shughuli za majaribio",
  "Needs and input requests that are not yet complete.": "Mahitaji na maombi ya pembejeo ambayo bado hayajakamilika.",
  "Farmer needs": "Mahitaji ya wakulima",
  "Input requests": "Maombi ya pembejeo",
  "Next actions": "Hatua zinazofuata",
  "Start with overdue requests or supplier commitments.": "Anza na maombi yaliyochelewa au ahadi za wasambazaji.",
  "No open requests": "Hakuna maombi yanayosubiri",
  "Business records": "Rekodi za biashara",
  "Self-reported records for your own review.": "Rekodi ulizoingiza kwa ajili ya mapitio yako.",
  "Follow-up owner": "Mhusika wa ufuatiliaji",
  "Owner, due date and response status": "Mhusika, tarehe ya mwisho na hali ya jibu",
  "Requests could not be loaded.": "Maombi hayakuweza kupakiwa.",
  "Loading requests…": "Inapakia maombi…",
  "No farmer needs to follow up": "Hakuna mahitaji ya mkulima ya kufuatilia",
  "New blockers will appear here after they are recorded.": "Changamoto mpya zitaonekana hapa zikisharekodiwa.",
  "Supplier commitment and delivery status": "Ahadi ya msambazaji na hali ya uwasilishaji",
  "No input requests yet": "Bado hakuna maombi ya pembejeo",
  "Record a request when a farmer needs poultry inputs.": "Rekodi ombi mkulima anapohitaji pembejeo za kuku.",
  "Supplier committed": "Msambazaji ameahidi",
  "Waiting for supplier": "Inasubiri msambazaji",
  "The supplier has committed. Confirm when the farmer receives the input.": "Msambazaji ameahidi. Thibitisha mkulima akipokea pembejeo.",
  "Confirm received": "Thibitisha kupokea",
  "Received": "Imepokelewa",
  "Waiting for a supplier commitment.": "Inasubiri ahadi ya msambazaji.",
  "See who is responding and what happens next.": "Ona anayejibu na hatua inayofuata.",
  "Request details are fictional. Updates save on this phone first and sync safely when a connection is available.": "Maelezo ya maombi ni ya kubuni. Masasisho huhifadhiwa kwanza kwenye simu na kusawazishwa mtandao unapopatikana.",
  "Receipt confirmation is saved on this phone and waiting to sync.": "Uthibitisho wa kupokea umehifadhiwa kwenye simu na unasubiri kusawazishwa.",
  "Showing saved request lists": "Inaonyesha orodha ya maombi yaliyohifadhiwa",
  "These lists may be out of date. Your changes will be checked against the server before they are applied.": "Orodha hizi zinaweza kuwa za zamani. Mabadiliko yako yatakaguliwa na seva kabla ya kutumika.",
  "No saved request list is available offline.": "Hakuna orodha ya maombi iliyohifadhiwa kwa matumizi bila mtandao.",
  "No open input requests": "Hakuna ombi la pembejeo linalosubiri",
  "New input requests will appear here when recorded.": "Maombi mapya ya pembejeo yataonekana hapa yakirekodiwa.",
  "Remove outdated update": "Ondoa sasisho la zamani",
  "Outdated update removed from this phone.": "Sasisho la zamani limeondolewa kwenye simu hii.",
  "Update status": "Sasisha hali",
  "Open": "Wazi",
  "Acknowledged": "Imepokelewa",
  "In progress": "Inaendelea",
  "Resolved": "Imetatuliwa",
  "Cannot resolve": "Haiwezi kutatuliwa",
  "Closed": "Imefungwa",
  "Overdue": "Imechelewa",
  "Response or reason": "Jibu au sababu",
  "What happened? Keep it brief.": "Nini kilitokea? Andika kwa kifupi.",
  "The agripreneur checked with the farmer and confirms this helped (proxy confirmation).": "Mjasiriamali amethibitisha na mkulima kuwa msaada huu ulisaidia (uthibitisho wa mwakilishi).",
  "Add a follow-up note before closing this request.": "Ongeza maelezo kabla ya kufunga ombi hili.",
  "Confirm with the farmer before marking this request resolved.": "Thibitisha na mkulima kabla ya kuweka ombi kuwa limetatuliwa.",
  "Save follow-up": "Hifadhi ufuatiliaji",
  "Retry pending sync": "Jaribu tena kusawazisha",
  "Sync pending update": "Sawazisha sasisho linalosubiri",
  "Update saved on this phone; waiting to sync.": "Sasisho limehifadhiwa kwenye simu; linasubiri kusawazishwa.",
  "Update synced.": "Sasisho limesawazishwa.",
  "Updates synced.": "Masasisho yamesawazishwa.",
  "Saved on this phone. Sync needs attention:": "Imehifadhiwa kwenye simu. Usawazishaji unahitaji kuangaliwa:",
  "Some updates need attention:": "Baadhi ya masasisho yanahitaji kuangaliwa:",
  "Saved on this phone. It will sync when you are connected.": "Imehifadhiwa kwenye simu. Itasawazishwa ukiwa na mtandao.",
  "Updates remain saved on this phone until a connection returns.": "Masasisho yatabaki kwenye simu hadi mtandao urudi.",
  "Sync status": "Hali ya usawazishaji",
  "Could not save or load this update.": "Sasisho hili halikuweza kuhifadhiwa au kupakiwa.",
  "updates saved on this phone": "masasisho yaliyohifadhiwa kwenye simu",
  "Enter a quantity greater than zero.": "Weka kiasi kikubwa kuliko sifuri.",
  "Needed by (YYYY-MM-DD)": "Inahitajika kufikia (YYYY-MM-DD)",
  "Poultry input": "Pembejeo ya kuku",
  "Day-old chicks": "Vifaranga wa siku moja",
  "Feed (bags)": "Chakula cha kuku (mifuko)",
  "Vaccines (doses)": "Chanjo (dozi)",
  "Drinkers/feeders": "Vyombo vya maji/chakula",
  "Quantity": "Kiasi",
  "Needed by": "Inahitajika kufikia",
  "Good morning": "Habari za asubuhi",
  "Your local-first agripreneur workspace": "Eneo lako la biashara ya kilimo linalofanya kazi bila mtandao",
  "Synthetic demo only": "Data ya mfano pekee",
  "Do not enter real farmer or financial details. This app stores demo records on this device and syncs them only to the local EKYAN API.": "Usiweke taarifa halisi za mkulima au fedha. Programu hii huhifadhi rekodi za mfano kwenye kifaa hiki na kuzituma kwa API ya ndani ya EKYAN pekee.",
  "Your business at a glance": "Muhtasari wa biashara yako",
  "Recorded income": "Mapato yaliyorekodiwa",
  "Operating costs": "Gharama za uendeshaji",
  "Operating surplus": "Ziada ya uendeshaji",
  "Months with records": "Miezi yenye rekodi",
  "Latest business records": "Rekodi za hivi karibuni za biashara",
  "See all": "Tazama zote",
  "Record a field update": "Rekodi taarifa ya shambani",
  "Grow your business, one clear record at a time.": "Kuza biashara yako kwa kuweka rekodi wazi hatua kwa hatua.",
  "Keep farmer support and everyday business records together—even when the connection drops.": "Weka pamoja msaada wa wakulima na rekodi za biashara—hata mtandao unapokatika.",
  "Busia · Poultry pilot": "Busia · majaribio ya ufugaji wa kuku",
  "Income · sale": "Mapato · mauzo",
  "Cost · purchase": "Gharama · ununuzi",
  "Capture a farmer need or practice intention": "Rekodi hitaji la mkulima au nia ya kutumia mbinu",
  "Keep a simple business book": "Weka daftari rahisi la biashara",
  "Record sales, costs, loans and savings": "Rekodi mauzo, gharama, mikopo na akiba",
  "Loading your local profile…": "Inapakia wasifu wako wa kifaa…",
  "Profile data could not be loaded.": "Taarifa za wasifu hazikuweza kupakiwa.",
  "Retry": "Jaribu tena",
  "No business records yet": "Bado hakuna rekodi za biashara",
  "Add your first sale or cost when you are ready.": "Ongeza mauzo au gharama yako ya kwanza ukiwa tayari.",
  "Paid": "Imelipwa",
  "Unpaid": "Haijalipwa",
  "Record an update": "Rekodi taarifa",
  "Practice intention": "Nia ya kutumia mbinu",
  "Farmer need": "Hitaji la mkulima",
  "Loading synthetic farmer records…": "Inapakia rekodi za wakulima wa mfano…",
  "Loading business records…": "Inapakia rekodi za biashara…",
  "I reviewed and confirm the category and urgency before routing this need.": "Nimekagua na kuthibitisha aina na uharaka kabla ya kuelekeza hitaji hili.",
  "Review and confirm the category and urgency before routing.": "Kagua na uthibitishe aina na uharaka kabla ya kuelekeza hitaji.",
  "Choose today or a future date.": "Chagua tarehe ya leo au ya baadaye.",
  "Synthetic farmer record": "Rekodi ya mkulima wa mfano",
  "Choose a farmer record": "Chagua rekodi ya mkulima",
  "Farmer reference": "Nambari ya rekodi ya mkulima",
  "No farmer records are available. Add a synthetic farmer record in the web field log first.": "Hakuna rekodi za wakulima. Ongeza rekodi ya mkulima wa mfano kwenye daftari la shambani la wavuti kwanza.",
  "No farmer records are available. Add a synthetic farmer record here first.": "Hakuna rekodi za wakulima. Ongeza rekodi ya mkulima wa mfano hapa kwanza.",
  "Practice description": "Maelezo ya mbinu",
  "Example: Synthetic vaccination plan": "Mfano: Mpango wa chanjo wa mfano",
  "Target date (YYYY-MM-DD)": "Tarehe lengwa (YYYY-MM-DD)",
  "What is the need?": "Hitaji ni nini?",
  "Example: Synthetic feed access issue": "Mfano: Changamoto ya upatikanaji wa chakula cha mifugo",
  "Category": "Aina",
  "Ward": "Wadi",
  "Urgency": "Uharaka",
  "Low": "Chini",
  "Medium": "Wastani",
  "High": "Juu",
  "Inputs": "Pembejeo",
  "Finance": "Fedha",
  "Water": "Maji",
  "Market": "Soko",
  "Disease": "Magonjwa",
  "Labour": "Wafanyakazi",
  "Land access": "Upatikanaji wa ardhi",
  "Time": "Muda",
  "Teso South": "Teso Kusini",
  "Nambale": "Nambale",
  "Matayos": "Matayos",
  "I have consent to record this synthetic farmer entry. This does not grant consent to share a finance profile.": "Nina idhini ya kurekodi taarifa hii ya mkulima wa mfano. Hii si idhini ya kushiriki wasifu wa fedha.",
  "Save to this phone": "Hifadhi kwenye simu hii",
  "Saved on this phone.": "Imehifadhiwa kwenye simu hii.",
  "Saved and synced to the local demo API.": "Imehifadhiwa na kusawazishwa kwa API ya mfano ya ndani.",
  "Still queued on this phone:": "Bado inasubiri kwenye simu hii:",
  "Pending sync": "Inasubiri kusawazishwa",
  "Sync pending entries": "Sawazisha rekodi zinazosubiri",
  "No entries are waiting to sync.": "Hakuna rekodi zinazosubiri kusawazishwa.",
  "The entry could not be saved locally.": "Rekodi haikuweza kuhifadhiwa kwenye simu.",
  "Choose a synthetic farmer record first.": "Chagua rekodi ya mkulima wa mfano kwanza.",
  "Confirm consent before recording this entry.": "Thibitisha idhini kabla ya kurekodi taarifa hii.",
  "Start descriptions with Synthetic or Demo. Do not enter real names or phone numbers.": "Anza maelezo kwa Synthetic au Demo. Usiweke majina au nambari halisi za simu.",
  "A future date is required.": "Tumia tarehe ya leo au tarehe ya baadaye.",
  "Pick a record type": "Chagua aina ya rekodi",
  "Loan received": "Mkopo uliopokelewa",
  "Loan repayment": "Marejesho ya mkopo",
  "Savings deposit": "Kuweka akiba",
  "Amount (KES)": "Kiasi (KES)",
  "Payment status": "Hali ya malipo",
  "Paid / received": "Imelipwa / imepokelewa",
  "Still owed / not yet paid": "Bado inadaiwa / haijalipwa",
  "Due date (YYYY-MM-DD, optional)": "Tarehe ya mwisho (YYYY-MM-DD, hiari)",
  "Optional note · synthetic only": "Maelezo ya hiari · ya mfano pekee",
  "Example: Synthetic feed purchase": "Mfano: Ununuzi wa chakula cha mifugo wa mfano",
  "Save business record": "Hifadhi rekodi ya biashara",
  "Add a business record": "Ongeza rekodi ya biashara",
  "A simple entry is enough to start": "Rekodi rahisi inatosha kuanza",
  "Your records, not a credit score": "Rekodi zako, si alama ya mkopo",
  "A record helps you understand your business. It is not a credit score, approval, or lender decision.": "Rekodi hukusaidia kuelewa biashara yako. Si alama ya mkopo, idhini, wala uamuzi wa mkopeshaji.",
  "An incomplete month may be seasonal or unrecorded; it is not counted as zero income.": "Mwezi usio na rekodi unaweza kuwa wa msimu au haukurekodiwa; hauhesabiwi kuwa na mapato sifuri.",
  "Sale income": "Mapato ya mauzo",
  "Service income": "Mapato ya huduma",
  "Other income": "Mapato mengine",
  "Purchase": "Ununuzi",
  "Other expense": "Gharama nyingine",
  "Savings withdrawal": "Kutoa akiba",
  "Owner contribution": "Mchango wa mmiliki",
  "Date (YYYY-MM-DD)": "Tarehe (YYYY-MM-DD)",
  "Enter an amount greater than zero.": "Weka kiasi kinachozidi sifuri.",
  "Choose a category for this record type.": "Chagua aina ya gharama inayolingana na rekodi hii.",
  "Enter a valid record date.": "Weka tarehe sahihi ya rekodi.",
  "Due date cannot be before the record date.": "Tarehe ya mwisho haiwezi kuwa kabla ya tarehe ya rekodi.",
  "Local business-record storage is unavailable.": "Hifadhi ya rekodi za biashara kwenye simu haipatikani.",
  "Due": "Mwisho",
  "Business record saved.": "Rekodi ya biashara imehifadhiwa.",
  "Business book data could not be loaded.": "Rekodi za biashara hazikuweza kupakiwa.",
  "No saved items": "Hakuna rekodi zilizohifadhiwa",
  "A month with no entries may be seasonal or simply unrecorded; it is not treated as zero income.": "Mwezi usio na rekodi unaweza kuwa wa msimu au haukurekodiwa; hauhesabiwi kuwa na mapato sifuri.",
  "Language preference could not be saved on this phone.": "Lugha iliyochaguliwa haikuweza kuhifadhiwa kwenye simu hii.",
  "Mobile navigation": "Urambazaji wa simu",
  "Refresh": "Sasisha",
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string) => string;
  preferenceError: string | null;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (active && (saved === "en" || saved === "sw")) setLanguageState(saved);
      })
      .catch(() => {
        if (active) setPreferenceError(SWAHILI["Language preference could not be saved on this phone."]);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
      setPreferenceError(null);
    } catch {
      setPreferenceError(
        nextLanguage === "sw"
          ? SWAHILI["Language preference could not be saved on this phone."]
          : "Language preference could not be saved on this phone."
      );
    }
  }, []);

  const t = useCallback(
    (key: string) => (language === "sw" ? SWAHILI[key] ?? key : key),
    [language]
  );
  const value = useMemo(
    () => ({ language, setLanguage, t, preferenceError }),
    [language, setLanguage, t, preferenceError]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider.");
  return context;
}
