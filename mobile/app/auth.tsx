import { useCallback, useEffect, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { checkApiHealth, getApiBaseUrl, signIn, signUp } from "@/src/api";
import { colors } from "@/src/theme";
import { GrowingLoader } from "@/src/ui";

export default function AccountScreen() {
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const checkConnection = useCallback(async () => {
    setCheckingApi(true);
    const reachable = await checkApiHealth();
    setApiReachable(reachable);
    setCheckingApi(false);
  }, []);

  useEffect(() => {
    let active = true;
    void checkApiHealth().then((reachable) => { if (active) setApiReachable(reachable); });
    return () => { active = false; };
  }, []);

  async function submit() {
    if (registering && !termsAccepted) {
      setError("Please read and accept the Terms & Conditions to create an account.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      if (registering) {
        const result = await signUp(name, email, password);
        if (!result.accessToken) { setNotice(result.message ?? "Your account is awaiting review."); return; }
      } else await signIn(email, password);
      router.replace("/(tabs)");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not access your account.");
    } finally { setBusy(false); }
  }

  function switchMode() {
    setRegistering(!registering);
    setError(""); setNotice(""); setTermsAccepted(false);
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar style="light" />
      <ImageBackground
        source={registering ? require("../assets/images/auth-signup.jpg") : require("../assets/images/auth-login.jpg")}
        style={styles.backdrop}
        imageStyle={styles.backgroundPhoto}
        resizeMode="cover"
      >
      <View style={styles.photoWash} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Ionicons name="leaf" size={21} color={colors.forest} /></View>
            <View><Text style={styles.brandName}>EKYAN <Text style={styles.brandLight}>Connect</Text></Text><Text style={styles.brandTag}>GROWING TOGETHER</Text></View>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{registering ? "YOUR NEXT CHAPTER STARTS HERE" : "ROOTED IN YOUR COMMUNITY"}</Text>
            <Text style={styles.heroTitle}>{registering ? "Build something" : "Good to see"}{"\n"}{registering ? "good, together." : "you again."}</Text>
            <Text style={styles.heroSub}>{registering ? "Simple tools for the work you do every day." : "Your farm work, people and plans in one place."}</Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.formHeading}>
            <Text style={styles.kicker}>{registering ? "JOIN THE PILOT" : "WELCOME BACK"}</Text>
            <Text style={styles.title}>{registering ? "Create your account" : "Sign in"}</Text>
            <Text style={styles.description}>{registering ? "Start with your demo account details." : "Pick up where you left off."}</Text>
          </View>

          <View style={[styles.connection, apiReachable === false && styles.connectionDown]}>
            <View style={[styles.dot, apiReachable === true && styles.dotUp, apiReachable === false && styles.dotDown]} />
            <Text style={[styles.connectionText, apiReachable === false && styles.connectionErrorText]}>{checkingApi ? "Checking connection…" : apiReachable === true ? "EKYAN is ready" : "EKYAN is offline"}</Text>
            {apiReachable === false && <Pressable onPress={() => void checkConnection()} accessibilityRole="button"><Text style={[styles.retry, styles.retryError]}>{checkingApi ? "Checking" : "Retry"}</Text></Pressable>}
          </View>
          {apiReachable === false && <Text style={styles.connectionHelp}>Trying {getApiBaseUrl()}. Keep your phone and computer on the same Wi-Fi, and run the API with <Text style={styles.bold}>--host 0.0.0.0</Text>.</Text>}

          {registering && <View style={styles.demoHint}><Ionicons name="sparkles-outline" size={16} color="#F3D17B" /><Text style={styles.demoHintText}>Demo name + .invalid email. No real participant details.</Text></View>}
          {registering && <Input icon="person-outline" value={name} onChangeText={setName} placeholder="Demo name" autoComplete="name" />}
          <Input icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Input icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder={registering ? "Password · 12 characters minimum" : "Password"} secureTextEntry autoComplete={registering ? "new-password" : "current-password"} />

          {registering && <View style={styles.termsRow}>
            <Pressable onPress={() => setTermsAccepted(!termsAccepted)} accessibilityRole="checkbox" accessibilityState={{ checked: termsAccepted }} style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>{termsAccepted && <Ionicons name="checkmark" size={13} color="#FFF" />}</Pressable>
            <Text style={styles.termsCopy}>I agree to the </Text>
            <Pressable onPress={() => setTermsOpen(true)} accessibilityRole="link"><Text style={styles.termsLink}>Terms & Conditions</Text></Pressable>
          </View>}

          {error ? <View style={styles.messageError}><Ionicons name="alert-circle-outline" size={17} color={colors.danger} /><Text accessibilityRole="alert" style={styles.messageText}>{error}</Text></View> : null}
          {notice ? <View style={styles.messageSuccess}><Ionicons name="checkmark-circle-outline" size={17} color={colors.greenDark} /><Text accessibilityRole="summary" style={styles.messageText}>{notice}</Text></View> : null}
          <Pressable style={({ pressed }) => [styles.button, (busy || (registering && !termsAccepted)) && styles.buttonDisabled, pressed && !busy && styles.buttonPressed]} disabled={busy || (registering && !termsAccepted)} onPress={() => void submit()} accessibilityRole="button">
            {busy ? <><GrowingLoader /><Text style={styles.buttonText}>{registering ? "Creating your space…" : "Signing you in…"}</Text></> : <><Text style={styles.buttonText}>{registering ? "Create account" : "Open my workspace"}</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></>}
          </Pressable>
          <Pressable onPress={switchMode} style={styles.switch} accessibilityRole="button"><Text style={styles.switchText}>{registering ? "Already joined? " : "New to EKYAN? "}<Text style={styles.switchAction}>{registering ? "Sign in" : "Create an account"}</Text></Text></Pressable>
          <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={15} color="#E7EEE8" /><Text style={styles.privacyText}>Prototype uses synthetic details only. Live programme data remains off. <Text onPress={() => setTermsOpen(true)} style={styles.termsLink}>Terms</Text></Text></View>
        </View>
      </ScrollView>
      </ImageBackground>

      <Modal visible={termsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTermsOpen(false)}>
        <View style={styles.termsPage}>
          <View style={styles.termsHeader}><View><Text style={[styles.kicker, styles.termsKicker]}>EKYAN CONNECT</Text><Text style={styles.termsTitle}>Terms & Conditions</Text></View><Pressable onPress={() => setTermsOpen(false)} style={styles.closeButton} accessibilityLabel="Close terms"><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.termsBody}>
            <Text style={styles.termsDate}>Pilot version · November 2026</Text>
            <TermsBlock title="1. The pilot service">EKYAN Connect is a prototype coordination tool for agripreneurs. Features may change, and demo accounts do not guarantee access to a live programme.</TermsBlock>
            <TermsBlock title="2. Use demo information only">During this pilot, use a Demo or Synthetic name and an email ending in .invalid. Do not enter real farmer, participant, financial, phone or precise location details.</TermsBlock>
            <TermsBlock title="3. Your account">Keep your sign-in details private. You are responsible for activity carried out from your account. Contact the programme team if you believe your account has been accessed improperly.</TermsBlock>
            <TermsBlock title="4. Advice and decisions">AI-generated information is supportive guidance and can be incomplete. A qualified human must confirm important agronomic, veterinary or finance decisions. The app does not provide pesticide dosage instructions.</TermsBlock>
            <TermsBlock title="5. Privacy and sharing">Your demo records are used to operate and improve this prototype. They are not authorization to share personal or financial records with a buyer, lender or other external party. Any future sharing requires separate, purpose-specific consent.</TermsBlock>
            <TermsBlock title="6. Availability and offline use">The service may be unavailable or change during the pilot. Some entries can remain on your device until they sync. Review pending updates when connectivity returns.</TermsBlock>
            <TermsBlock title="7. Acceptance">By selecting “I agree” and creating an account, you confirm that you understand and accept these pilot terms.</TermsBlock>
            <View style={styles.termsBlock}>
              <Text style={styles.termsBlockTitle}>Photo credits</Text>
              <Text style={styles.termsBlockText}>Login: “Kenyan Rural women” by Queen Asali · CC BY 4.0</Text>
              <Pressable onPress={() => void Linking.openURL("https://commons.wikimedia.org/wiki/File:Kenyan_Rural_women.jpg")}><Text style={styles.creditLink}>View source and license ↗</Text></Pressable>
              <Text style={[styles.termsBlockText, { marginTop: 8 }]}>Create account: “Kenya farm” by Mwangielias161 · CC BY-SA 4.0</Text>
              <Pressable onPress={() => void Linking.openURL("https://commons.wikimedia.org/wiki/File:Kenya_farm.jpg")}><Text style={styles.creditLink}>View source and license ↗</Text></Pressable>
              <Text style={[styles.termsBlockText, { marginTop: 7 }]}>Shown with a responsive crop; the downloaded source photos are unchanged.</Text>
            </View>
          </ScrollView>
          <Pressable style={styles.acceptButton} onPress={() => { setTermsAccepted(true); setTermsOpen(false); setError(""); }}><Text style={styles.buttonText}>I understand</Text></Pressable>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap }) {
  const { icon, ...inputProps } = props;
  return <View style={styles.inputWrap}><Ionicons name={icon} size={18} color="#73847C" /><TextInput {...inputProps} style={styles.input} placeholderTextColor="#899890" accessibilityLabel={inputProps.placeholder} /></View>;
}

function TermsBlock({ title, children }: { title: string; children: string }) {
  return <View style={styles.termsBlock}><Text style={styles.termsBlockTitle}>{title}</Text><Text style={styles.termsBlockText}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.forest },
  scroll: { flex: 1 },
  backdrop: { flex: 1 },
  backgroundPhoto: { width: "100%", height: "100%" },
  photoWash: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(16, 42, 31, 0.53)" },
  content: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: 0 },
  hero: { flex: 1, minHeight: 225, maxHeight: 390, paddingTop: 56, paddingHorizontal: 24, paddingBottom: 28, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, zIndex: 2 },
  brandMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#F3F3E4", alignItems: "center", justifyContent: "center" },
  brandName: { color: "#FFFDF5", fontWeight: "800", letterSpacing: 0.3, fontSize: 16 },
  brandLight: { fontWeight: "500" }, brandTag: { color: "#DBE6D4", fontSize: 9, letterSpacing: 1.6, marginTop: 3, fontWeight: "700" },
  heroCopy: { zIndex: 2, width: "84%", marginTop: 27, marginBottom: 10 },
  heroEyebrow: { color: "#EED99A", fontSize: 9, letterSpacing: 1.5, fontWeight: "800", marginBottom: 8 },
  heroTitle: { color: "#FFFDF5", fontSize: 31, lineHeight: 36, fontWeight: "800", letterSpacing: -0.6 },
  heroSub: { color: "#E5EBDF", fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 220 },
  formSection: { width: "100%", maxWidth: 540, alignSelf: "center", paddingHorizontal: 24, paddingTop: 22, paddingBottom: 19, backgroundColor: "transparent" },
  formHeading: { marginBottom: 13 },
  kicker: { color: "#F3D17B", fontSize: 9, fontWeight: "800", letterSpacing: 1.8 }, termsKicker: { color: colors.greenDark },
  title: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  description: { color: "#F2F5EE", fontSize: 13, marginTop: 4 },
  connection: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.20)", marginBottom: 12 },
  connectionDown: { backgroundColor: "rgba(252,237,234,0.96)" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#A3A3A3" }, dotUp: { backgroundColor: colors.greenDark }, dotDown: { backgroundColor: colors.danger },
  connectionText: { flex: 1, color: "#FFFFFF", fontSize: 10, fontWeight: "700" }, connectionErrorText: { color: colors.danger }, retry: { color: "#F3D17B", fontSize: 11, fontWeight: "800", padding: 4 }, retryError: { color: colors.greenDark },
  connectionHelp: { color: "#FFFFFF", marginTop: -6, marginBottom: 10, fontSize: 10, lineHeight: 15 }, bold: { fontWeight: "800" },
  demoHint: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 9 }, demoHintText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  inputWrap: { height: 51, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, backgroundColor: "rgba(255, 255, 255, 0.76)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.75)", marginBottom: 10 },
  input: { flex: 1, height: "100%", color: colors.ink, fontSize: 13, paddingVertical: 0 },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 36, marginBottom: 7 }, checkbox: { height: 19, width: 19, borderRadius: 5, borderColor: "rgba(255,255,255,0.82)", borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, checkboxChecked: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  termsCopy: { color: "#FFFFFF", fontSize: 11 }, termsLink: { color: "#F3D17B", fontWeight: "800" },
  messageError: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 11, backgroundColor: "#FCEDEA", padding: 10, marginBottom: 9 },
  messageSuccess: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 11, backgroundColor: "#EAF4EA", padding: 10, marginBottom: 9 }, messageText: { color: colors.ink, flex: 1, fontSize: 11, lineHeight: 16 },
  button: { minHeight: 54, borderRadius: 99, backgroundColor: colors.greenDark, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 3, paddingHorizontal: 20, shadowColor: colors.forest, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  buttonDisabled: { opacity: 0.48 }, buttonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] }, buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  switch: { minHeight: 43, alignItems: "center", justifyContent: "center" }, switchText: { color: "#F2F5EE", fontSize: 11 }, switchAction: { color: "#F3D17B", fontWeight: "800" },
  privacy: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", paddingHorizontal: 8 }, privacyText: { color: "#E7EEE8", fontSize: 9, lineHeight: 14, flexShrink: 1, textAlign: "center" },
  termsPage: { flex: 1, backgroundColor: colors.background, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20 },
  termsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 15, borderBottomColor: colors.line, borderBottomWidth: 1 },
  termsTitle: { color: colors.ink, fontSize: 23, fontWeight: "800", marginTop: 5 }, closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E9EEE7", alignItems: "center", justifyContent: "center" },
  termsBody: { paddingTop: 15, paddingBottom: 20 }, termsDate: { color: colors.muted, fontSize: 11, marginBottom: 8 }, termsBlock: { marginTop: 12 }, termsBlockTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", marginBottom: 4 }, termsBlockText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  creditLink: { color: colors.greenDark, fontWeight: "800", fontSize: 11, textDecorationLine: "underline", marginTop: 4 },
  acceptButton: { minHeight: 50, backgroundColor: colors.greenDark, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
