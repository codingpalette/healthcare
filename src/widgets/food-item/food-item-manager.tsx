"use client"

import { useState } from "react"
import { Utensils, Search, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Skeleton,
} from "@/shared/ui"
import { useFoodItems, useDeleteFoodItem } from "@/features/food-item"
import type { FoodItem } from "@/entities/food-item"

interface FoodItemManagerProps {
  onAdd?: () => void
  onEdit?: (item: FoodItem) => void
}

export function FoodItemManager({ onAdd, onEdit }: FoodItemManagerProps) {
  const [search, setSearch] = useState("")
  const { data: items, isLoading } = useFoodItems()
  const deleteFoodItem = useDeleteFoodItem()

  // 클라이언트 사이드 검색 필터링
  const filtered = (items ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    try {
      await deleteFoodItem.mutateAsync(id)
      toast.success("음식이 삭제되었습니다")
    } catch {
      toast.error("음식 삭제에 실패했습니다")
    }
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-primary/10 p-2">
              <Utensils className="size-4 text-primary" />
            </div>
            음식 DB 관리
          </CardTitle>
          <Button size="sm" onClick={onAdd}>
            <Plus className="size-4" />
            음식 추가
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="음식명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 테이블 */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Utensils className="mb-2 size-8" />
            <p>{search ? "검색 결과가 없습니다" : "등록된 음식이 없습니다"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>음식명</TableHead>
                  <TableHead className="text-right">기준량</TableHead>
                  <TableHead>단위</TableHead>
                  <TableHead className="text-right">칼로리</TableHead>
                  <TableHead className="text-right">탄수화물</TableHead>
                  <TableHead className="text-right">단백질</TableHead>
                  <TableHead className="text-right">지방</TableHead>
                  <TableHead className="text-right">섬유질</TableHead>
                  <TableHead className="w-20 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <FoodItemRow
                    key={item.id}
                    item={item}
                    onEdit={() => onEdit?.(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FoodItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: FoodItem
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="text-right">{item.servingSize}</TableCell>
      <TableCell>{item.unit}</TableCell>
      <TableCell className="text-right">
        {item.calories != null ? `${item.calories} kcal` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {item.carbs != null ? `${item.carbs} g` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {item.protein != null ? `${item.protein} g` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {item.fat != null ? `${item.fat} g` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {item.fiber != null ? `${item.fiber} g` : "-"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <Trash2 className="size-3.5 text-destructive" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>음식 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{item.name}&quot;을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}
