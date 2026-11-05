/**
 * Brique de partage réutilisable (mot du jour, Lier, …) : une carte visuelle + l'écran qui la partage.
 *
 * API
 * - `LIEN_JEU` : lien d'invitation ajouté à chaque message (provisoire, voir TODO).
 * - `messageInvitation(phrase)` → « <phrase> Tu fais mieux ? Joue gratuitement : <LIEN_JEU> ».
 *   La phrase décrit la performance, jamais la solution (pas de mot secret).
 * - `<CartePartage {...CarteProps} />` : la carte (fond chaud, Nabulo, gros chiffre, cases colorées, série).
 * - `<EcranPartage carte={…CarteProps} message="…" onClose={…} />` : écran plein (à poser en `position: absolute`
 *   par-dessus l'écran appelant) avec l'aperçu de la carte, « Partager » (jaune) et « Copier le texte ».
 *   Téléphone : la carte est capturée en PNG (react-native-view-shot) et partagée en image avec le texte
 *   (iOS : image + texte dans la même feuille ; Android : texte copié d'abord, à coller sous l'image).
 *   Web, ou si la capture échoue : partage du texte seul / copie du texte.
 *
 * Exemple (Lier) :
 *   <EcranPartage onClose={fermer} message={messageInvitation('J’ai relié « ? » à « ? » en 4 coups sur Nabulo 🔗')}
 *     carte={{ jeu: 'Lier', date: shortDate(), chiffre: 4, unite: 'coups', detail: 'sans indice', cases: [{ couleur: '#FF9A3C' }] }} />
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Platform, Pressable, Share, View, useWindowDimensions, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { gameInk } from '@/theme/colors';
import { Button } from './Button';
import { Icon, images } from './bits';
import { GameBg } from './game';
import { captureDisponible, capturerVue, copierDansPressePapiers, partagerImage } from './partage-capture';
import { T } from './Text';
import { Toast, useToast } from './Toast';

/** TODO(store) : remplacer par le vrai lien (page store / lien universel) dès que l'appli est publiée. */
export const LIEN_JEU = 'nabulo.app';

export const messageInvitation = (phrase: string) => `${phrase} Tu fais mieux ? Joue gratuitement : ${LIEN_JEU}`;

/** Une case colorée ; `texte` (court, ex. un nombre) l'agrandit pour l'afficher dedans. */
export type CaseCarte = { couleur: string; texte?: string };

export type CarteProps = {
  /** Nom du jeu affiché en haut à droite (« Mot du jour », « Lier »…). */
  jeu: string;
  /** Date courte (« 5 nov. »), facultative. */
  date?: string;
  /** Le gros chiffre (essais, coups, points…). */
  chiffre: number | string;
  /** Unité sous le chiffre (« essais »). */
  unite: string;
  /** Petite ligne sous l'unité (« 1 indice »). */
  detail?: string;
  /** Cases colorées (ex. température de chaque essai), affichées dans l'ordre. */
  cases?: CaseCarte[];
  /** Série en cours (jours d'affilée) : affichée à partir de 2. */
  serie?: number;
  /** Largeur de la carte (px), 320 par défaut. */
  largeur?: number;
};

const INK = gameInk;
const SH = (h: number) => ({ textShadowColor: '#2B2150', textShadowOffset: { width: 0, height: h }, textShadowRadius: 0 }) as const;
const FOND = ['#4B33B8', '#6E4FE6', '#C24A9A', '#FF7A3C', '#FFB13D'] as const;

export function CartePartage({ jeu, date, chiffre, unite, detail, cases = [], serie = 0, largeur = 320 }: CarteProps) {
  const grandes = cases.some(c => c.texte);
  const cote = grandes ? 34 : cases.length > 24 ? 14 : 18;
  return (
    <LinearGradient colors={FOND as unknown as [string, string, ...string[]]} locations={[0, 0.3, 0.62, 0.86, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
      style={{ width: largeur, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', padding: 16, gap: 12, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T size={26} weight={700} color="#FFFFFF" style={[{ flex: 1 }, SH(3)]}>Nabulo</T>
        <View style={{ flexShrink: 0, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)' }}>
          <T size={13} weight={700} color="#FFFFFF">{jeu}{date ? ` · ${date}` : ''}</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {/* l'image du saut a de grandes marges : même cadrage que l'écran de victoire, ramené à 104 px */}
        <View style={{ width: 104, height: 104 }}>
          <Image source={images.nabuloSaut} style={{ position: 'absolute', left: -31, top: -50, width: 166, height: 166 }} contentFit="contain" accessibilityLabel="Nabulo saute de joie" />
        </View>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
          <T size={String(chiffre).length > 3 ? 54 : 72} weight={700} color="#FFFFFF" style={SH(5)}>{chiffre}</T>
          <T size={22} weight={700} color="#FFFFFF" style={[{ marginTop: -6 }, SH(2)]}>{unite}</T>
          {detail ? <T size={15} weight={600} color="#FFFFFF" style={{ opacity: 0.92 }}>{detail}</T> : null}
        </View>
      </View>

      {cases.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: grandes ? 6 : 5, padding: 10, borderRadius: 18, backgroundColor: 'rgba(43,33,80,0.28)' }}>
          {cases.map((c, i) => (
            <View key={i} style={{ width: cote, height: cote, borderRadius: grandes ? 10 : 5, backgroundColor: c.couleur, alignItems: 'center', justifyContent: 'center' }}>
              {c.texte ? <T size={15} weight={700} color={INK}>{c.texte}</T> : null}
            </View>
          ))}
        </View>
      )}

      {serie >= 2 && (
        <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 8, paddingRight: 12, borderRadius: 14, backgroundColor: '#FFD45C' }}>
          <Flamme size={18} />
          <T size={15} weight={700} color={INK}>série de {serie} jours</T>
        </View>
      )}

      <View style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center' }}>
        <T size={17} weight={700} color={INK}>Tu fais mieux ?</T>
        <T size={13} weight={600} color="#6B6290">Joue gratuitement sur {LIEN_JEU}</T>
      </View>
    </LinearGradient>
  );
}

/** Écran de partage : aperçu de la carte + « Partager » / « Copier le texte ». */
export function EcranPartage({ carte, message, onClose, titre = 'Partager' }: { carte: CarteProps; message: string; onClose: () => void; titre?: string }) {
  const inset = useSafeAreaInsets();
  const toast = useToast(3000);
  const vue = useRef<ViewInstance>(null);
  const { width } = useWindowDimensions();
  const largeur = Math.min(340, width - 32);

  const copier = async () => {
    if (await copierDansPressePapiers(message)) { toast.show('Texte copié !'); return; }
    Share.share({ message }).catch(() => {});
  };
  const partager = async () => {
    if (captureDisponible) {
      const uri = await capturerVue(vue.current);
      if (uri && await partagerImage(uri, message)) {
        if (Platform.OS === 'android') toast.show('Texte copié : colle-le sous l’image');
        return;
      }
    }
    if (Platform.OS === 'web') { await copier(); return; }
    Share.share({ message }).catch(() => {});
  };

  return (
    <View style={{ flex: 1 }}>
      <GameBg />
      <View style={{ flex: 1, paddingTop: inset.top + 4, paddingBottom: inset.bottom + 24, paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour au résultat" onPress={onClose} hitSlop={4}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={20} color={INK} />
          </Pressable>
          <T size={20} weight={700} color="#FFFFFF" style={[{ flex: 1, minWidth: 0 }, SH(2)]}>{titre}</T>
        </View>
        <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View ref={vue} collapsable={false} accessible accessibilityLabel={`Carte à partager : ${carte.chiffre} ${carte.unite}${carte.detail ? `, ${carte.detail}` : ''}`}>
            <CartePartage {...carte} largeur={largeur} />
          </View>
          <T size={14} weight={600} color="#FFFFFF" align="center" style={{ maxWidth: largeur, opacity: 0.9 }}>sans dévoiler le mot : à tes amis de le trouver !</T>
        </View>
        <View style={{ gap: 10 }}>
          <Button label="Partager" variant="yellow" fontSize={19} onPress={partager} />
          <Button label="Copier le texte" variant="white" fontSize={17} height={50} onPress={copier} />
        </View>
      </View>
      <Toast msg={toast.msg} style={{ bottom: 140 + inset.bottom }} />
    </View>
  );
}

function Flamme({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5c.8 3.6 5.8 5.6 5.8 11.3a5.8 5.8 0 0 1-11.6 0c0-2.9 1.6-4.6 2.7-6.3.2 1.9 1 2.9 2 3.2-.5-3 .2-5.8 1.1-8.2z"
        fill="#FF7A2E" stroke="#C2410C" strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12 13.2c.6 1.5 2.4 2.2 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.3.9-2.2 1.4-2.9.2.6.5.9.9 1-.1-.8-.1-1.5.1-2.2z" fill="#FFD45C" />
    </Svg>
  );
}
