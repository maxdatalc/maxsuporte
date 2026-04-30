import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  onUploaded?: (url: string | null) => void;
  showRemove?: boolean;
}

const sizeMap = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function AvatarUpload({
  userId,
  currentUrl,
  name,
  size = "md",
  onUploaded,
  showRemove = true,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFile = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast({ variant: "destructive", title: "Formato inválido", description: "Envie um arquivo JPG ou PNG." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Tamanho máximo: 5MB." });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setUrl(publicUrl);
      onUploaded?.(publicUrl);
      toast({ title: "Foto atualizada!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao enviar foto", description: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", userId);
      if (error) throw error;
      setUrl(null);
      onUploaded?.(null);
      toast({ title: "Foto removida" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className={sizeMap[size]}>
        {url && <AvatarImage src={url} alt={name || "Avatar"} />}
        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {url ? "Alterar foto" : "Enviar foto"}
        </Button>
        {showRemove && url && (
          <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={handleRemove}>
            <Trash2 className="mr-2 h-4 w-4" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}
