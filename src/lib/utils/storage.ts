// Supabase Storageのキーは非ASCII文字（日本語ファイル名など）を含むと
// "Invalid key" エラーになるため、元のファイル名は使わずランダムな名前にする
export function randomStoragePath(userId: string, file: File): string {
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}
