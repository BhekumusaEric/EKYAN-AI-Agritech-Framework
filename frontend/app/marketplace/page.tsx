import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Handshake, ShoppingBasket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusNotice } from "@/components/ui/status-notice";

export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-7 lg:p-9">
      <section>
        <Badge variant="warning"><ShoppingBasket aria-hidden="true" size={14} /> Planned service</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Buyer marketplace · Phase 2</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Buyer demand, produce forecasting and contract workflows are outside the current MVP. The pilot starts with pooled input demand for Busia poultry.
        </p>
      </section>

      <StatusNotice tone="info" title="No live buyer offers, prices or matches">
        Do not interpret this preview as a buyer commitment, market quote, contract, forecast or guarantee of income.
      </StatusNotice>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          { title: "Buyer demand", text: "Verified buyer requirements, quality specifications and delivery windows.", icon: Users, tone: "bg-sky-50 text-sky-800" },
          { title: "Supply readiness", text: "Expected produce, location, quality and readiness date from consented records.", icon: ShoppingBasket, tone: "bg-brand-50 text-brand-800" },
          { title: "Terms and fulfilment", text: "Track acceptance and payment status only after partner and policy review.", icon: BadgeDollarSign, tone: "bg-amber-50 text-amber-900" },
        ].map(({ title, text, icon: Icon, tone }) => (
          <Card key={title}>
            <CardHeader>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon aria-hidden="true" size={20} />
              </span>
              <CardTitle className="pt-2">{title}</CardTitle>
              <CardDescription>{text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Reuse before building</CardTitle>
          <CardDescription>OneNetwork and approved buyer partners should be accessed through replaceable adapters.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex gap-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <Handshake aria-hidden="true" className="mt-0.5 shrink-0 text-brand-700" size={18} />
            No external marketplace integration or matching logic is connected in this frontend prototype.
          </p>
          <Link href="/demand" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-800 hover:text-brand-950">
            Open the MVP supplier demand board <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
