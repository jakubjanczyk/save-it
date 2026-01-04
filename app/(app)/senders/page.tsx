import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SendersPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Senders</h1>
        <p className="text-muted-foreground text-sm">
          Configure which newsletters we should process.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Sender management UI will live here.
        </CardContent>
      </Card>
    </div>
  );
}
