import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Centered } from "../src/ui";

WebBrowser.maybeCompleteAuthSession();

export default function SsoCallback() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }, 400);
    return () => clearTimeout(timer);
  }, [router]);
  return <Centered label="Finishing sign-in" />;
}
