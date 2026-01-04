import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Home</h1>
        <p className="text-muted-foreground text-sm">
          This is a placeholder dashboard for now.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Add senders first, then we’ll fetch newsletters and extract links.
        </CardContent>
      </Card>
    </div>
  );
}
