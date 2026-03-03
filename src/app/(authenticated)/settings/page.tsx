"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Service, ServiceAccount, Entity, PaymentCard } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Key, Trash2, Shield, CreditCard, Star, Layers, FolderOpen, Pencil, ChevronDown, Download, Upload, Database } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FetcherInfo {
  serviceSlug: string;
  displayName: string;
  credentialFields: { key: string; label: string; type?: string }[];
}

interface ConfiguredCred {
  accountId: number;
  accountLabel: string;
  serviceName: string;
  serviceSlug: string;
  configured: boolean;
}

export default function SettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [fetchers, setFetchers] = useState<FetcherInfo[]>([]);
  const [configuredCreds, setConfiguredCreds] = useState<ConfiguredCred[]>([]);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Entity dialog
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [editEntityId, setEditEntityId] = useState<number | null>(null);
  const [entityName, setEntityName] = useState("");
  const [entityColor, setEntityColor] = useState("#6366f1");

  // Card dialog
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [cardLabel, setCardLabel] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cardBrand, setCardBrand] = useState("visa");
  const [cardIsDefault, setCardIsDefault] = useState(false);

  // Add service dialog
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("other");

  // Add/Edit account dialog
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [accountLabel, setAccountLabel] = useState("");
  const [accountBaseService, setAccountBaseService] = useState("");
  const [accountEntity, setAccountEntity] = useState("none");
  const [accountFetcher, setAccountFetcher] = useState("none");
  const [accountColor, setAccountColor] = useState("#6366f1");

  // Credential dialog
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ServiceAccount | null>(null);
  const [credFields, setCredFields] = useState<Record<string, string>>({});

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/entities").then((r) => r.json()),
      fetch("/api/credentials/fetchers").then((r) => r.json()),
      fetch("/api/credentials").then((r) => r.json()),
      fetch("/api/cards").then((r) => r.json()),
    ]).then(([servicesData, accountsData, entitiesData, fetchersData, credsData, cardsData]) => {
      setServices(servicesData);
      setAccounts(accountsData);
      setEntities(entitiesData);
      setFetchers(fetchersData);
      setConfiguredCreds(credsData);
      setPaymentCards(cardsData);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Entity handlers
  function openAddEntity() {
    setEditEntityId(null);
    setEntityName("");
    setEntityColor("#6366f1");
    setEntityDialogOpen(true);
  }

  function openEditEntity(entity: Entity) {
    setEditEntityId(entity.id);
    setEntityName(entity.name);
    setEntityColor(entity.color || "#6366f1");
    setEntityDialogOpen(true);
  }

  async function handleSaveEntity(e: React.FormEvent) {
    e.preventDefault();
    if (editEntityId) {
      await fetch(`/api/entities/${editEntityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entityName, color: entityColor }),
      });
      toast.success("Entity updated");
    } else {
      await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entityName, color: entityColor }),
      });
      toast.success("Entity added");
    }
    setEntityDialogOpen(false);
    fetchData();
  }

  async function handleDeleteEntity(id: number) {
    if (!confirm("Delete this entity? Accounts will become unassigned.")) return;
    await fetch(`/api/entities/${id}`, { method: "DELETE" });
    toast.success("Entity deleted");
    fetchData();
  }

  // Service handler
  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    const slug = newServiceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newServiceName,
        slug,
        category: newServiceCategory,
        hasAutoFetch: false,
      }),
    });
    toast.success("Service type added");
    setAddServiceOpen(false);
    setNewServiceName("");
    fetchData();
  }

  // Account handlers
  function openAddAccount() {
    setEditAccountId(null);
    setAccountLabel("");
    setAccountBaseService("");
    setAccountEntity("none");
    setAccountFetcher("none");
    setAccountColor("#6366f1");
    setAddAccountOpen(true);
  }

  function openEditAccount(account: ServiceAccount) {
    setEditAccountId(account.id);
    setAccountLabel(account.label);
    setAccountBaseService(account.serviceId.toString());
    setAccountEntity(account.entityId?.toString() || "none");
    setAccountFetcher(account.fetcherSlug || "none");
    setAccountColor(account.color || "#6366f1");
    setAddAccountOpen(true);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    const fetcherSlug = accountFetcher === "none" ? null : accountFetcher;

    if (editAccountId) {
      await fetch(`/api/accounts/${editAccountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: accountLabel,
          entityId: accountEntity === "none" ? null : parseInt(accountEntity),
          fetcherSlug,
          color: accountColor,
        }),
      });
      toast.success("Account updated");
    } else {
      const baseService = services.find((s) => s.id.toString() === accountBaseService);
      if (!baseService) return;

      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: baseService.id,
          entityId: accountEntity === "none" ? null : parseInt(accountEntity),
          label: accountLabel,
          fetcherSlug,
          color: accountColor,
        }),
      });
      toast.success(`Account "${accountLabel}" added`);
    }
    setAddAccountOpen(false);
    fetchData();
  }

  async function handleDeleteAccount(id: number) {
    if (!confirm("Delete this account? All associated costs and credentials will be removed.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    toast.success("Account deleted");
    fetchData();
  }

  // Credential handlers
  const fetcherMap = new Map(fetchers.map((f) => [f.serviceSlug, f]));

  function getAccountFetcher(account: ServiceAccount): FetcherInfo | undefined {
    if (!account.fetcherSlug) return undefined;
    return fetcherMap.get(account.fetcherSlug);
  }

  function openCredDialog(account: ServiceAccount) {
    setSelectedAccount(account);
    setCredFields({});
    setCredDialogOpen(true);
  }

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;

    await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: selectedAccount.id,
        credentials: credFields,
      }),
    });

    toast.success("Credentials saved");
    setCredDialogOpen(false);
    fetchData();
  }

  async function handleDeleteCredentials(accountId: number) {
    if (!confirm("Remove API credentials for this account?")) return;
    await fetch(`/api/credentials?accountId=${accountId}`, { method: "DELETE" });
    toast.success("Credentials removed");
    fetchData();
  }

  // Card handlers
  function openAddCard() {
    setEditCardId(null);
    setCardLabel("");
    setCardLast4("");
    setCardBrand("visa");
    setCardIsDefault(false);
    setCardDialogOpen(true);
  }

  function openEditCard(card: PaymentCard) {
    setEditCardId(card.id);
    setCardLabel(card.label);
    setCardLast4(card.last4 || "");
    setCardBrand(card.brand || "visa");
    setCardIsDefault(card.isDefault ?? false);
    setCardDialogOpen(true);
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      label: cardLabel,
      last4: cardLast4 || null,
      brand: cardBrand,
      isDefault: cardIsDefault,
    };
    if (editCardId) {
      await fetch(`/api/cards/${editCardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Card updated");
    } else {
      await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Card added");
    }
    setCardDialogOpen(false);
    fetchData();
  }

  async function handleDeleteCard(id: number) {
    if (!confirm("Remove this payment card?")) return;
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    toast.success("Card removed");
    fetchData();
  }

  async function handleSetDefaultCard(id: number) {
    await fetch(`/api/cards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    toast.success("Default card updated");
    fetchData();
  }

  // Group accounts by entity
  const accountsByEntity = accounts.reduce<Record<string, ServiceAccount[]>>((acc, account) => {
    const group = account.entityName || "Unassigned";
    if (!acc[group]) acc[group] = [];
    acc[group].push(account);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAddEntity}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Add Entity
          </Button>
          <Button variant="outline" onClick={openAddAccount}>
            <Layers className="mr-2 h-4 w-4" />
            Add Account
          </Button>
          <Button onClick={() => setAddServiceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service Type
          </Button>
        </div>
      </div>

      {/* Entities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Entities (Projects / Products)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Group your service accounts by project or product.
          </p>
          {entities.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No entities yet. Click &quot;Add Entity&quot; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {entities.map((entity) => {
                const entityAccounts = accounts.filter((a) => a.entityId === entity.id);
                return (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entity.color || "#6366f1" }}
                      />
                      <span className="font-medium">{entity.name}</span>
                      <Badge variant="secondary">
                        {entityAccounts.length} account{entityAccounts.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditEntity(entity)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEntity(entity.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Service Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Each account tracks costs independently. One service type can have multiple accounts (e.g., AWS Prod, AWS Staging).
            Credentials are encrypted and stored locally.
          </p>
          {Object.entries(accountsByEntity).map(([group, accts]) => (
            <Collapsible key={group} className="group mb-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <h3 className="text-sm font-semibold text-muted-foreground">{group}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {accts.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {accts.map((account) => {
                    const hasFetcher = account.fetcherSlug && getAccountFetcher(account);
                    const isConfigured = configuredCreds.some(
                      (c) => c.accountId === account.id
                    );
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: account.color || "#6366f1" }}
                          />
                          <span className="font-medium">{account.label}</span>
                          <Badge variant="outline">{account.serviceName}</Badge>
                          {hasFetcher && (
                            <Badge variant="outline" className="text-xs">
                              via {account.fetcherSlug}
                            </Badge>
                          )}
                          {hasFetcher && isConfigured && (
                            <Badge variant="default" className="bg-green-600">
                              Credentials configured
                            </Badge>
                          )}
                          {hasFetcher && !isConfigured && (
                            <Badge variant="secondary">No credentials</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {hasFetcher && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCredDialog(account)}
                              >
                                <Key className="mr-2 h-3 w-3" />
                                {isConfigured ? "Update" : "Configure"}
                              </Button>
                              {isConfigured && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCredentials(account.id)}
                                  title="Remove credentials"
                                >
                                  <Shield className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditAccount(account)}
                            title="Edit account"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                            title="Delete account"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Payment Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Cards
          </CardTitle>
          <Button size="sm" onClick={openAddCard}>
            <Plus className="mr-2 h-3 w-3" />
            Add Card
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Pre-define your payment cards to quickly assign them when entering costs.
          </p>
          {paymentCards.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No cards added yet. Click &quot;Add Card&quot; to add your first card.
            </div>
          ) : (
            <div className="space-y-3">
              {paymentCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{card.label}</span>
                    {card.brand && (
                      <Badge variant="outline" className="capitalize">
                        {card.brand}
                      </Badge>
                    )}
                    {card.last4 && (
                      <span className="text-sm text-muted-foreground">
                        **** {card.last4}
                      </span>
                    )}
                    {card.isDefault && (
                      <Badge variant="default" className="bg-blue-600">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!card.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefaultCard(card.id)}
                      >
                        <Star className="mr-1 h-3 w-3" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCard(card)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Service Types */}
      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Service types are templates for creating accounts. Add a new type if your provider isn&apos;t listed.
          </p>
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{service.name}</span>
                  <Badge variant="outline">{service.category}</Badge>
                  {service.hasAutoFetch && (
                    <Badge variant="secondary">Auto-fetch</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Backup & Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Backup & Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Download a JSON backup of all your data.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/api/backup";
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Backup
            </Button>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Import data from a SQLite backup (.db) file. This will replace all existing data.
            </p>
            <input
              type="file"
              accept=".db"
              id="backup-import"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";

                if (!file.name.endsWith(".db")) {
                  toast.error("Please select a .db SQLite backup file.");
                  return;
                }

                if (!confirm("This will replace ALL existing data. Are you sure?")) return;

                try {
                  const formData = new FormData();
                  formData.append("file", file);

                  const res = await fetch("/api/backup", {
                    method: "POST",
                    body: formData,
                  });

                  const result = await res.json();
                  if (!res.ok) {
                    toast.error(result.error || "Import failed");
                    return;
                  }

                  toast.success(
                    `Imported: ${result.imported.services} services, ${result.imported.costRecords} cost records, ${result.imported.serviceAccounts} accounts`
                  );
                  window.location.reload();
                } catch (err) {
                  toast.error("Failed to import backup file");
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("backup-import")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import SQLite Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entity Dialog */}
      <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntityId ? "Edit Entity" : "Add Entity"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEntity} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g., Project Alpha, Personal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={entityColor}
                  onChange={(e) => setEntityColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border"
                />
                <Input
                  value={entityColor}
                  onChange={(e) => setEntityColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEntityDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!entityName}>
                {editEntityId ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Service Type Dialog */}
      <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g., Vercel"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newServiceCategory} onValueChange={setNewServiceCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="cloud">Cloud</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="dev-tools">Dev Tools</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddServiceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newServiceName}>
                Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAccountId ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          {!editAccountId && (
            <p className="text-sm text-muted-foreground">
              Create a new billable account for a service type. Each account gets its own
              credentials and cost tracking.
            </p>
          )}
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={accountBaseService} disabled={!!editAccountId} onValueChange={(v) => {
                setAccountBaseService(v);
                // Auto-set fetcher if service has one
                const svc = services.find((s) => s.id.toString() === v);
                if (svc && svc.hasAutoFetch) {
                  // Find default fetcher for this service slug
                  const fetcher = fetchers.find((f) => f.serviceSlug === svc.slug);
                  if (fetcher) setAccountFetcher(fetcher.serviceSlug);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Label</Label>
              <Input
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                placeholder="e.g., AWS - Prod, OpenAI - Team A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Entity (optional)</Label>
              <Select value={accountEntity} onValueChange={setAccountEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No entity</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Auto-fetch via</Label>
              <Select value={accountFetcher} onValueChange={setAccountFetcher}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (manual only)</SelectItem>
                  {fetchers.map((f) => (
                    <SelectItem key={f.serviceSlug} value={f.serviceSlug}>
                      {f.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accountColor}
                  onChange={(e) => setAccountColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border"
                />
                <Input
                  value={accountColor}
                  onChange={(e) => setAccountColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddAccountOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!accountBaseService || !accountLabel}>
                Add Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCardId ? "Edit Payment Card" : "Add Payment Card"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="space-y-4">
            <div className="space-y-2">
              <Label>Card Label</Label>
              <Input
                value={cardLabel}
                onChange={(e) => setCardLabel(e.target.value)}
                placeholder="e.g., Company Visa, Personal Amex"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Card Brand</Label>
                <Select value={cardBrand} onValueChange={setCardBrand}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">Amex</SelectItem>
                    <SelectItem value="discover">Discover</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last 4 Digits (optional)</Label>
                <Input
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4242"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="card-default"
                checked={cardIsDefault}
                onChange={(e) => setCardIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="card-default">Set as default card</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCardDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!cardLabel}>
                {editCardId ? "Update Card" : "Add Card"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credential Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure {selectedAccount?.label} Credentials
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && getAccountFetcher(selectedAccount) && (
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              {getAccountFetcher(selectedAccount)!.credentialFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type === "password" ? "password" : "text"}
                    value={credFields[field.key] || ""}
                    onChange={(e) =>
                      setCredFields({ ...credFields, [field.key]: e.target.value })
                    }
                    placeholder={field.label}
                    required
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCredDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Credentials</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
